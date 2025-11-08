import { useEffect, useState, useRef } from "react";
import { useConversation } from "@11labs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceAgentProps {
  onConversationEnd?: (conversationId?: string) => void;
}

const VoiceAgent = ({ onConversationEnd }: VoiceAgentProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const conversationIdRef = useRef<string | undefined>();
  
  const conversation = useConversation({
    onConnect: () => {
      console.log("Conversation connected");
      toast({
        title: "Connected",
        description: "You can start speaking now",
      });
    },
    onDisconnect: () => {
      const convId = conversationIdRef.current;
      console.log("Conversation disconnected, ID:", convId);
      onConversationEnd?.(convId);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the voice agent",
        variant: "destructive",
      });
    },
  });

  const startConversation = async () => {
    setIsLoading(true);
    try {
      console.log("Requesting signed URL from edge function");
      
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-signed-url');

      if (error) throw error;
      
      if (!data?.signed_url) {
        throw new Error("Failed to get signed URL");
      }

      console.log("Starting conversation with signed URL");
      const convId = await conversation.startSession({ 
        signedUrl: data.signed_url 
      });
      
      conversationIdRef.current = convId;
      console.log("Conversation started with ID:", convId);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
      console.log("Conversation ended manually");
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6 sm:py-8">
      <div className="text-center space-y-3">
        {conversation.status === "connected" ? (
          <>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-medium text-foreground">
              {conversation.isSpeaking ? "Agent is speaking..." : "Listening..."}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tap to speak when agent finishes
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center">
              <MicOff className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
            </div>
            <p className="text-base sm:text-lg font-medium">Ready to start</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Tap the button below to begin</p>
          </>
        )}
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        {conversation.status !== "connected" ? (
          <Button 
            onClick={startConversation}
            disabled={isLoading}
            size="lg"
            className="flex-1 h-14 text-base sm:text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Call
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="flex-1 h-14 text-base sm:text-lg font-semibold"
          >
            <MicOff className="w-5 h-5 mr-2" />
            End Call
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceAgent;
