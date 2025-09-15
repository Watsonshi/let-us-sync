import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Info } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onLoadDefault: () => void;
  isLoading: boolean;
}

export const FileUpload = ({ onFileSelect, onLoadDefault, isLoading }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="shadow-custom-md">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button
            onClick={onLoadDefault}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            檔案格式說明
          </Button>
          
          <span className="text-sm text-muted-foreground">或</span>
          
          <div className="flex items-center gap-2 flex-1">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              選擇檔案
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          選擇並上傳您的Excel賽程檔案（支援.xlsx或.csv格式）來開始使用動態時間表。
        </p>
      </CardContent>
    </Card>
  );
};