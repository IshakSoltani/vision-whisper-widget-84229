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
  claimId?: string;
}

const Conversation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { toast } = useToast();
  const [conversationEnded, setConversationEnded] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    // Redirect if no state data
    if (!state?.imageUrl) {
      navigate("/");
    }
  }, [state, navigate]);

  const handleConversationEnd = (convId?: string) => {
    setConversationEnded(true);
    setConversationId(convId);
  };

  const handleNext = async () => {
    if (!conversationId) {
      toast({
        title: "No Conversation ID",
        description: "Cannot retrieve transcript",
        variant: "destructive",
      });
      return;
    }

    setLoadingTranscript(true);
    try {
      console.log("Fetching transcript and sending to Airtable:", conversationId);
      
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-transcript', {
        body: { 
          conversationId,
          claimId: state.claimId
        }
      });

      if (error) throw error;

      console.log("Transcript sent to Airtable successfully");
      
      toast({
        title: "Success!",
        description: "Transcript has been sent to Airtable",
      });

      // Navigate to home after successful send
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      console.error("Error sending transcript:", error);
      toast({
        title: "Error",
        description: "Could not send transcript to Airtable",
        variant: "destructive",
      });
    } finally {
      setLoadingTranscript(false);
    }
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
                  <h2 className="text-3xl font-bold">Conversation Complete!</h2>
                  <p className="text-xl text-muted-foreground">
                    Click Next to submit your information
                  </p>
                </div>
                
                <Button 
                  onClick={handleNext}
                  size="lg"
                  className="mt-6"
                  disabled={loadingTranscript}
                >
                  {loadingTranscript ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Next"
                  )}
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
