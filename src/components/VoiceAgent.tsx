import { useEffect, useState } from "react";
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
  const [conversationId, setConversationId] = useState<string | undefined>();
  
  const conversation = useConversation({
    onConnect: () => {
      console.log("Conversation connected");
      toast({
        title: "Connected",
        description: "You can start speaking now",
      });
    },
    onDisconnect: () => {
      console.log("Conversation disconnected, ID:", conversationId);
      onConversationEnd?.(conversationId);
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
      
      setConversationId(convId);
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
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center space-y-2">
        {conversation.status === "connected" ? (
          <>
            <div className="flex justify-center">
              <div className="relative">
                <Mic className="w-16 h-16 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {conversation.isSpeaking ? "Agent is speaking..." : "Listening..."}
            </p>
          </>
        ) : (
          <>
            <MicOff className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Ready to start</p>
          </>
        )}
      </div>

      <div className="flex gap-4">
        {conversation.status !== "connected" ? (
          <Button 
            onClick={startConversation}
            disabled={isLoading}
            size="lg"
            className="min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Call
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="min-w-[140px]"
          >
            <MicOff className="w-4 h-4 mr-2" />
            End Call
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceAgent;
