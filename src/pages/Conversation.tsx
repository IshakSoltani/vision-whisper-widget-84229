import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import VoiceAgent from "@/components/VoiceAgent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocationState {
  imageUrl: string;
  userName: string;
}

const Conversation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { toast } = useToast();
  const [conversationEnded, setConversationEnded] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    // Redirect if no state data
    if (!state?.imageUrl) {
      navigate("/");
    }
  }, [state, navigate]);

  const handleConversationEnd = async (conversationId?: string) => {
    setConversationEnded(true);
    
    if (conversationId) {
      setLoadingTranscript(true);
      try {
        console.log("Fetching transcript for conversation:", conversationId);
        
        const { data, error } = await supabase.functions.invoke('get-elevenlabs-transcript', {
          body: { conversationId }
        });

        if (error) throw error;

        console.log("Transcript data:", data);
        
        // Extract transcript from conversation data
        if (data?.transcript) {
          setTranscript(data.transcript);
        } else if (data?.analysis?.transcript_text) {
          setTranscript(data.analysis.transcript_text);
        } else {
          // Build transcript from messages if available
          const messages = data?.messages || [];
          const transcriptText = messages
            .map((msg: any) => `${msg.role === 'agent' ? 'Agent' : 'User'}: ${msg.message}`)
            .join('\n\n');
          setTranscript(transcriptText || "Transcript not available");
        }

        toast({
          title: "Transcript Retrieved",
          description: "Your conversation transcript is ready",
        });
      } catch (error) {
        console.error("Error fetching transcript:", error);
        toast({
          title: "Transcript Error",
          description: "Could not retrieve conversation transcript",
          variant: "destructive",
        });
      } finally {
        setLoadingTranscript(false);
      }
    }
  };

  const handleStartOver = () => {
    navigate("/");
  };

  if (!state?.imageUrl) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-primary/10">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <Card className="p-6 md:p-8 backdrop-blur-sm bg-card/80 border-border/50 shadow-lg">
            {!conversationEnded ? (
              <div className="space-y-6">
                <div className="text-center space-y-4 pb-6 border-b border-border">
                  <img 
                    src={state.imageUrl} 
                    alt="Uploaded" 
                    className="max-w-sm mx-auto rounded-lg shadow-md" 
                  />
                  <div>
                    <h2 className="text-2xl font-semibold">Talk to Our Agent</h2>
                    <p className="text-muted-foreground">
                      Our agent will ask you a few questions about your image
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <VoiceAgent onConversationEnd={handleConversationEnd} />
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 py-12 animate-scale-in">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-20 h-20 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Thank You!</h2>
                  <p className="text-xl text-muted-foreground">
                    You'll hear from us soon
                  </p>
                </div>
                
                {loadingTranscript && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading transcript...</span>
                  </div>
                )}

                {transcript && (
                  <div className="mt-6 text-left">
                    <h3 className="text-lg font-semibold mb-3">Conversation Transcript</h3>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">{transcript}</pre>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleStartOver}
                  size="lg"
                  className="mt-6"
                >
                  Start Over
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
