import { useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}
const ImageUpload = ({
  onImageSelect
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
    }
  };
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };
  return <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handleFileSelect} 
        className="hidden" 
      />
      
      <div className="py-12 sm:py-16 px-4 sm:px-6 text-center space-y-4 sm:space-y-6">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold">Upload Evidence Photo</h3>
          <p className="text-sm sm:text-base text-muted-foreground">Take a photo or choose from gallery</p>
        </div>

        <Button 
          onClick={openFileDialog} 
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity h-12 sm:h-14 text-base sm:text-lg px-8 font-semibold" 
          size="lg"
        >
          <Upload className="w-5 h-5 mr-2" />
          Take Photo / Upload
        </Button>

        <p className="text-xs sm:text-sm text-muted-foreground">
          JPG, PNG, WEBP • Max 10MB
        </p>
      </div>
    </div>;
};
export default ImageUpload;