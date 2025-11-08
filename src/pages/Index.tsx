import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import VoiceAgent from "@/components/VoiceAgent";
import UserInfoForm, { UserInfo } from "@/components/UserInfoForm";
import jessicaLogo from "@/assets/jessica-logo.png";
type UploadStatus = "idle" | "uploading" | "verifying" | "processing" | "ready" | "accepted" | "evaluates";
const Index = () => {
  const navigate = useNavigate();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [n8nMessage, setN8nMessage] = useState<string>("");
  const {
    toast
  } = useToast();
  const handleImageUpload = async (file: File) => {
    setUploadStatus("uploading");
    const localImageUrl = URL.createObjectURL(file);
    setUploadedImage(localImageUrl);
    try {
      // Upload to cloud storage first
      const {
        supabase
      } = await import("@/integrations/supabase/client");
      const fileName = `${Date.now()}-${file.name}`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('uploads').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('uploads').getPublicUrl(fileName);

      // Send only the metadata with image URL to n8n (no binary file)
      const metadata = {
        imageUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadTimestamp: new Date().toISOString(),
        ...(userInfo && {
          userName: userInfo.name,
          claimId: userInfo.claimId
        })
      };

      setUploadStatus("verifying");
      
      // Create a timeout controller for 2 minutes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
      
      try {
        const response = await fetch("https://hellio.app.n8n.cloud/webhook-test/258992ad-34a7-4d90-918f-2768de1e6e5c", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(metadata),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Check if response has content
      const responseText = await response.text();
      console.log("n8n raw response:", responseText);
      
      if (!responseText || responseText.trim() === '') {
        throw new Error("No response received from server. Please ensure n8n workflow returns a JSON response.");
      }

      // Parse n8n response
      let n8nResponse;
      try {
        n8nResponse = JSON.parse(responseText);
        console.log("n8n parsed response:", n8nResponse);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
      }

      // Check for status field and handle three possible responses
      if (!n8nResponse.status) {
        throw new Error("Invalid response from server: missing status field");
      }

      const responseMessage = n8nResponse.message || "";
      setN8nMessage(responseMessage);

      if (n8nResponse.status === "accepts") {
        // Evidence upload complete - show completion screen
        setUploadStatus("accepted");
        toast({
          title: "Upload Complete",
          description: responseMessage || "Your evidence has been accepted."
        });
      } else if (n8nResponse.status === "declines") {
        // Navigate to conversation page with ElevenLabs agent
        navigate("/conversation", {
          state: {
            imageUrl: publicUrl,
            userName: userInfo?.name || "Guest",
            claimId: userInfo?.claimId
          }
        });
      } else if (n8nResponse.status === "evaluates") {
        // Show evaluation page with message
        setUploadStatus("evaluates");
        toast({
          title: "Under Evaluation",
          description: responseMessage || "Your submission is being reviewed."
        });
      } else {
        throw new Error(`Unexpected status: ${n8nResponse.status}`);
      }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("Upload error:", error);
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Request timeout",
          description: "The verification is taking longer than expected. Please try again or contact support.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
      setUploadStatus("idle");
    }
  };
  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadedImage(null);
    setUserInfo(null);
    setN8nMessage("");
  };
  const handleUserInfoSubmit = (data: UserInfo) => {
    setUserInfo(data);
    toast({
      title: "Information saved",
      description: "You can now upload your image."
    });
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-primary/10 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <img 
              src={jessicaLogo} 
              alt="Jessica Logo" 
              className="h-20 md:h-24 mx-auto mb-4 object-contain"
            />
          </div>

          {/* User Info Form */}
          {!userInfo && <Card className="p-6 md:p-8 backdrop-blur-sm bg-card/80 border-border/50 shadow-lg">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold">Your Information</h2>
                  <p className="text-muted-foreground">Please provide your details before uploading an image</p>
                </div>
                <UserInfoForm onSubmit={handleUserInfoSubmit} />
              </div>
            </Card>}

          {/* Upload Section */}
          {userInfo && <Card className="p-6 md:p-8 backdrop-blur-sm bg-card/80 border-border/50 shadow-lg">
              {uploadStatus === "idle" && <ImageUpload onImageSelect={handleImageUpload} />}

            {uploadStatus === "uploading" && <div className="text-center py-12 space-y-4 animate-scale-in">
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <p className="text-lg font-medium">Uploading image...</p>
              </div>}

            {uploadStatus === "verifying" && <div className="text-center py-12 space-y-4 animate-scale-in">
                <div className="relative">
                  {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="max-w-xs mx-auto rounded-lg shadow-md mb-6" />}
                </div>
                <Loader2 className="w-16 h-16 mx-auto text-accent animate-spin" />
                <p className="text-lg font-medium">Verifying your submission...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we review your image
                </p>
              </div>}

            {uploadStatus === "processing" && <div className="text-center py-12 space-y-4 animate-scale-in">
                <div className="relative">
                  {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="max-w-xs mx-auto rounded-lg shadow-md mb-6" />}
                </div>
                <Loader2 className="w-16 h-16 mx-auto text-accent animate-spin" />
                <p className="text-lg font-medium">Processing image...</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing and preparing for conversation
                </p>
              </div>}

            {uploadStatus === "accepted" && <div className="text-center py-12 space-y-4 animate-fade-in">
                {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="max-w-sm mx-auto rounded-lg shadow-md mb-6" />}
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
                <p className="text-xl font-semibold">Evidence Upload Complete</p>
                <p className="text-muted-foreground">{n8nMessage || "Your submission has been successfully processed."}</p>
                <Button onClick={resetUpload} className="mt-4">
                  Start Over
                </Button>
              </div>}

            {uploadStatus === "evaluates" && <div className="text-center py-12 space-y-4 animate-fade-in">
                {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="max-w-sm mx-auto rounded-lg shadow-md mb-6" />}
                <CheckCircle2 className="w-16 h-16 mx-auto text-accent" />
                <p className="text-xl font-semibold">Under Evaluation</p>
                <p className="text-muted-foreground">{n8nMessage || "Your submission is being reviewed. We'll notify you once the evaluation is complete."}</p>
                <Button onClick={resetUpload} variant="outline" className="mt-4">
                  Start Over
                </Button>
              </div>}

            {uploadStatus === "ready" && <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-4 pb-6 border-b border-border">
                  {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="max-w-sm mx-auto rounded-lg shadow-md" />}
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                    <p className="text-lg font-medium">Image ready for analysis</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <MessageCircle className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Talk to the agent</h3>
                  </div>
                  
                  <VoiceAgent />
                  
                  <Button onClick={resetUpload} variant="outline" className="w-full mt-4">
                    Upload Another Image
                  </Button>
                </div>
              </div>}
            </Card>}

          {/* Info Cards */}
          {uploadStatus === "idle" && userInfo && <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
              <Card className="p-4 backdrop-blur-sm bg-card/60 border-border/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Upload</h3>
                    <p className="text-sm text-muted-foreground">
                      Drop your image or click to browse
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 backdrop-blur-sm bg-card/60 border-border/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Loader2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Process</h3>
                    <p className="text-sm text-muted-foreground">
                      AI analyzes your image content
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 backdrop-blur-sm bg-card/60 border-border/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Discuss</h3>
                    <p className="text-sm text-muted-foreground">
                      Chat with voice agent about details
                    </p>
                  </div>
                </div>
              </Card>
            </div>}
        </div>
      </div>
    </div>;
};
export default Index;