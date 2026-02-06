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

function parseRaceInfoFromMarkdown(markdown: string): { currentEventNo: number | null; inspectionEventNo: number | null; rawCurrentText: string | null; rawInspectionText: string | null; debug: string } {
  let rawCurrentText: string | null = null;
  let rawInspectionText: string | null = null;

  // 從 markdown 中解析
  // 格式可能是: 即時比賽項目 \n (41)13 & 14歲級女子組游泳 200公尺蛙式 計時決賽
  const currentMatch = markdown.match(/即時比賽項目\s*\n?\s*(\([^)]+\)[^\n]+)/i);
  if (currentMatch) {
    rawCurrentText = currentMatch[1].trim();
  }

  const inspectionMatch = markdown.match(/即時檢錄項目\s*\n?\s*(\([^)]+\)[^\n]+)/i);
  if (inspectionMatch) {
    rawInspectionText = inspectionMatch[1].trim();
  }

  const currentEventNo = rawCurrentText ? parseEventNumber(rawCurrentText) : null;
  const inspectionEventNo = rawInspectionText ? parseEventNumber(rawInspectionText) : null;

  // 除錯資訊
  const debugMatch = markdown.match(/即時比賽項目[\s\S]{0,150}/i);
  const debug = debugMatch ? debugMatch[0].substring(0, 150) : 'Pattern not found';

  return {
    currentEventNo,
    inspectionEventNo,
    rawCurrentText,
    rawInspectionText,
    debug,
  };
}

function parseRaceInfoFromHtml(html: string): { currentEventNo: number | null; inspectionEventNo: number | null; rawCurrentText: string | null; rawInspectionText: string | null; debug: string } {
  let rawCurrentText: string | null = null;
  let rawInspectionText: string | null = null;

  // 策略 1: 精確匹配 label + div 結構
  const currentMatch1 = html.match(/即時比賽項目<\/label>\s*\n?\s*<div[^>]*>([^<]+)<\/div>/i);
  if (currentMatch1) {
    rawCurrentText = currentMatch1[1].trim().replace(/&amp;/g, '&');
  }
  
  // 策略 2: 更寬鬆的匹配
  if (!rawCurrentText) {
    const currentMatch2 = html.match(/即時比賽項目[\s\S]*?<div[^>]*class="col-sm-8"[^>]*>([^<]+)</i);
    if (currentMatch2) {
      rawCurrentText = currentMatch2[1].trim().replace(/&amp;/g, '&');
    }
  }

  // 策略 3: 直接找括號開頭的項目資訊
  if (!rawCurrentText) {
    const currentMatch3 = html.match(/即時比賽項目[\s\S]{0,100}?\((\d+)\)([^<\n]+)/i);
    if (currentMatch3) {
      rawCurrentText = `(${currentMatch3[1]})${currentMatch3[2]}`.trim().replace(/&amp;/g, '&');
    }
  }

  // 解析即時檢錄項目
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
    const inspectionMatch3 = html.match(/即時檢錄項目[\s\S]{0,100}?\((\d+)\)([^<\n]+)/i);
    if (inspectionMatch3) {
      rawInspectionText = `(${inspectionMatch3[1]})${inspectionMatch3[2]}`.trim().replace(/&amp;/g, '&');
    }
  }

  const currentEventNo = rawCurrentText ? parseEventNumber(rawCurrentText) : null;
  const inspectionEventNo = rawInspectionText ? parseEventNumber(rawInspectionText) : null;

  const debugMatch = html.match(/即時比賽項目[\s\S]{0,150}/i);
  const debug = debugMatch ? debugMatch[0].substring(0, 150) : 'Pattern not found';

  return {
    currentEventNo,
    inspectionEventNo,
    rawCurrentText,
    rawInspectionText,
    debug,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sourceUrl = 'https://ctsa.utk.com.tw/CTSA/public/race/running_game.aspx';
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    console.log('Fetching race info from:', sourceUrl);
    console.log('Using Firecrawl:', !!firecrawlApiKey);

    let parsedData: { currentEventNo: number | null; inspectionEventNo: number | null; rawCurrentText: string | null; rawInspectionText: string | null; debug: string };
    let fetchMethod = 'unknown';

    if (firecrawlApiKey) {
      // 使用 Firecrawl 抓取（支援 JavaScript 渲染）
      fetchMethod = 'firecrawl';
      console.log('Using Firecrawl to scrape page');
      
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${sourceUrl}?_t=${Date.now()}`, // 加上時間戳記避免快取
          formats: ['markdown', 'html'],
          onlyMainContent: false,
          waitFor: 3000, // 等待 3 秒讓 JavaScript 渲染
        }),
      });

      if (!firecrawlResponse.ok) {
        const errorText = await firecrawlResponse.text();
        throw new Error(`Firecrawl API error: ${firecrawlResponse.status} - ${errorText}`);
      }

      const firecrawlData = await firecrawlResponse.json();
      console.log('Firecrawl response success:', firecrawlData.success);

      // 優先從 markdown 解析，如果失敗再從 html 解析
      const markdown = firecrawlData.data?.markdown || '';
      const html = firecrawlData.data?.html || '';

      console.log('Markdown length:', markdown.length);
      console.log('HTML length:', html.length);

      parsedData = parseRaceInfoFromMarkdown(markdown);
      
      // 如果 markdown 解析失敗，嘗試 html
      if (!parsedData.currentEventNo && !parsedData.inspectionEventNo && html) {
        console.log('Markdown parsing failed, trying HTML...');
        parsedData = parseRaceInfoFromHtml(html);
      }
    } else {
      // 降級：使用直接 fetch（可能無法獲取動態內容）
      fetchMethod = 'direct-fetch';
      console.log('Firecrawl not configured, using direct fetch');
      
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
      console.log('Direct fetch HTML length:', html.length);
      parsedData = parseRaceInfoFromHtml(html);
    }

    const { currentEventNo, inspectionEventNo, rawCurrentText, rawInspectionText, debug } = parsedData;

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

    // Upsert 資料
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

    // 檢查項次是否變更
    let autoUpdatedEventNo: number | null = null;
    if (previousEventNo && currentEventNo && previousEventNo !== currentEventNo && currentEventNo > previousEventNo) {
      console.log(`Event changed from ${previousEventNo} to ${currentEventNo}`);
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
        fetchMethod,
        debug,
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
