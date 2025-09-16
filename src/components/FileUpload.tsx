import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Info, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onLoadDefault: () => void;
  onLoadPlayerList: () => void;
  isLoading: boolean;
}

export const FileUpload = ({ onFileSelect, onLoadDefault, onLoadPlayerList, isLoading }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="shadow-custom-md">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button
            onClick={onLoadDefault}
            disabled={isLoading}
            className="bg-gradient-primary hover:shadow-custom-glow transition-all duration-300 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isLoading ? '載入中...' : '載入預設賽程'}
          </Button>
          
          <Button
            onClick={onLoadPlayerList}
            disabled={isLoading}
            className="bg-gradient-secondary hover:shadow-custom-glow transition-all duration-300 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isLoading ? '載入中...' : '載入選手名單'}
          </Button>
          
          <span className="text-sm text-muted-foreground">或</span>
          
          <div className="flex-1">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border-2 border-dashed border-primary/20">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleUploadClick}
                className="w-full h-12 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                選擇Excel檔案
              </Button>
            )}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          點擊「載入預設賽程」自動載入游泳比賽資料，或選擇其他Excel檔案（支援.xlsx或.csv格式）。
        </p>
      </CardContent>
    </Card>
  );
};