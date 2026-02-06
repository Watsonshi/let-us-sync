import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapeResult {
  currentEventNo: number | null;
  inspectionEventNo: number | null;
  rawCurrentText: string | null;
  rawInspectionText: string | null;
  success: boolean;
  error?: string;
}

function parseEventNumber(text: string): number | null {
  // 匹配括號內的數字，例如 (41) -> 41
  const match = text.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseRaceInfo(html: string): { currentEventNo: number | null; inspectionEventNo: number | null; rawCurrentText: string | null; rawInspectionText: string | null; debug?: string } {
  // 嘗試多種解析策略
  let rawCurrentText: string | null = null;
  let rawInspectionText: string | null = null;

  // 策略 1: 精確匹配 label + div 結構
  // HTML 結構: <label class="...">即時比賽項目</label>\n<div class="col-sm-8">(...)</div>
  const currentMatch1 = html.match(/即時比賽項目<\/label>\s*\n?\s*<div[^>]*>([^<]+)<\/div>/i);
  if (currentMatch1) {
    rawCurrentText = currentMatch1[1].trim().replace(/&amp;/g, '&');
  }
  
  // 策略 2: 如果策略 1 失敗，嘗試更寬鬆的匹配
  if (!rawCurrentText) {
    const currentMatch2 = html.match(/即時比賽項目[\s\S]*?<div[^>]*class="col-sm-8"[^>]*>([^<]+)</i);
    if (currentMatch2) {
      rawCurrentText = currentMatch2[1].trim().replace(/&amp;/g, '&');
    }
  }

  // 策略 3: 直接找括號開頭的項目資訊
  if (!rawCurrentText) {
    const currentMatch3 = html.match(/即時比賽項目[\s\S]{0,100}?\((\d+)\)([^<]+)/i);
    if (currentMatch3) {
      rawCurrentText = `(${currentMatch3[1]})${currentMatch3[2]}`.trim().replace(/&amp;/g, '&');
    }
  }

  // 解析即時檢錄項目（同樣使用多策略）
  const inspectionMatch1 = html.match(/即時檢錄項目<\/label>\s*\n?\s*<div[^>]*>([^<]+)<\/div>/i);
  if (inspectionMatch1) {
    rawInspectionText = inspectionMatch1[1].trim().replace(/&amp;/g, '&');
  }
  
  if (!rawInspectionText) {
    const inspectionMatch2 = html.match(/即時檢錄項目[\s\S]*?<div[^>]*class="col-sm-8"[^>]*>([^<]+)</i);
    if (inspectionMatch2) {
      rawInspectionText = inspectionMatch2[1].trim().replace(/&amp;/g, '&');
    }
  }

  if (!rawInspectionText) {
    const inspectionMatch3 = html.match(/即時檢錄項目[\s\S]{0,100}?\((\d+)\)([^<]+)/i);
    if (inspectionMatch3) {
      rawInspectionText = `(${inspectionMatch3[1]})${inspectionMatch3[2]}`.trim().replace(/&amp;/g, '&');
    }
  }

  const currentEventNo = rawCurrentText ? parseEventNumber(rawCurrentText) : null;
  const inspectionEventNo = rawInspectionText ? parseEventNumber(rawInspectionText) : null;

  // 除錯：提取 HTML 中的關鍵部分
  const debugMatch = html.match(/即時比賽項目[\s\S]{0,200}/i);
  const debug = debugMatch ? debugMatch[0].substring(0, 200) : 'Pattern "即時比賽項目" not found in HTML';
  
  // 額外除錯：檢查 HTML 中是否有 "live" 區塊
  const hasLiveDiv = html.includes('class="live"');
  const hasUpdatePanel = html.includes('UpdatePanel');
  const hasFormGroup = html.includes('form-group');
  
  return {
    currentEventNo,
    inspectionEventNo,
    rawCurrentText,
    rawInspectionText,
    debug,
    hasLiveDiv,
    hasUpdatePanel,
    hasFormGroup,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sourceUrl = 'https://ctsa.utk.com.tw/CTSA/public/race/running_game.aspx';

    console.log('Fetching race info from:', sourceUrl);

    // 抓取外部網頁
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Fetched HTML length:', html.length);

  // 解析 HTML
    const { currentEventNo, inspectionEventNo, rawCurrentText, rawInspectionText, debug } = parseRaceInfo(html);

    console.log('Parsed data:', {
      currentEventNo,
      inspectionEventNo,
      rawCurrentText,
      rawInspectionText,
      debug,
    });

    // 連接 Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 查詢現有記錄
    const { data: existingData, error: selectError } = await supabase
      .from('race_sync_status')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Error selecting existing data:', selectError);
      throw selectError;
    }

    const previousEventNo = existingData?.current_event_no;

    // Upsert 資料（如果沒有記錄則插入，有則更新）
    if (existingData) {
      const { error: updateError } = await supabase
        .from('race_sync_status')
        .update({
          current_event_no: currentEventNo,
          inspection_event_no: inspectionEventNo,
          raw_current_text: rawCurrentText,
          raw_inspection_text: rawInspectionText,
          last_synced_at: new Date().toISOString(),
          source_url: sourceUrl,
        })
        .eq('id', existingData.id);

      if (updateError) {
        console.error('Error updating data:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('race_sync_status')
        .insert({
          current_event_no: currentEventNo,
          inspection_event_no: inspectionEventNo,
          raw_current_text: rawCurrentText,
          raw_inspection_text: rawInspectionText,
          source_url: sourceUrl,
        });

      if (insertError) {
        console.error('Error inserting data:', insertError);
        throw insertError;
      }
    }

    // 檢查項次是否變更，如果變更則自動更新前一項次的 actual_end
    let autoUpdatedEventNo: number | null = null;
    if (previousEventNo && currentEventNo && previousEventNo !== currentEventNo && currentEventNo > previousEventNo) {
      console.log(`Event changed from ${previousEventNo} to ${currentEventNo}, auto-updating actual_end for event ${previousEventNo}`);

      // 查詢前一項次的最後一組（heat_num 最大）是否已有 actual_end
      const { data: existingActualTime } = await supabase
        .from('actual_times')
        .select('*')
        .eq('event_no', previousEventNo)
        .order('heat_num', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 如果沒有記錄，不做任何事（因為我們無法知道該項次有多少組）
      // 如果有記錄但已有 actual_end，也不需要更新
      // 這個邏輯可以在前端更精確處理，因為前端有完整的賽程資料
      autoUpdatedEventNo = previousEventNo;
    }

    const result: ScrapeResult = {
      currentEventNo,
      inspectionEventNo,
      rawCurrentText,
      rawInspectionText,
      success: true,
    };

    return new Response(
      JSON.stringify({
        ...result,
        previousEventNo,
        autoUpdatedEventNo,
        debug,
        hasLiveDiv,
        hasUpdatePanel,
        hasFormGroup,
        htmlLength: html.length,
        message: 'Race info synced successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scrape-race-info:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        currentEventNo: null,
        inspectionEventNo: null,
        rawCurrentText: null,
        rawInspectionText: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
