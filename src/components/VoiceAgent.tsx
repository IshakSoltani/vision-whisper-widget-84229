import { useEffect, useState } from "react";
import { useConversation } from "@11labs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

interface VoiceAgentProps {
  onConversationEnd?: (conversationId?: string) => void;
}

const VoiceAgent = ({ onConversationEnd }: VoiceAgentProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs");
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
      setIsConnected(false);
      if (conversationId) {
        console.log("Conversation ended, ID:", conversationId);
        onConversationEnd?.(conversationId);
      }
    },
    onMessage: (message) => {
      console.log("Message received:", message);
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
    },
  });

  const startConversation = async () => {
    try {
      console.log("Starting conversation...");
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the conversation with the agent
      const convId = await conversation.startSession({
        agentId: "agent_4901k9f8wvw3emx80zw8ybxvqkdp",
      });
      
      console.log("Conversation started with ID:", convId);
      setConversationId(convId);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center gap-4">
        {!isConnected ? (
          <Button
            onClick={startConversation}
            size="lg"
            className="w-full max-w-md"
          >
            <Phone className="w-5 h-5 mr-2" />
            Start Conversation
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {conversation.isSpeaking ? "Agent is speaking..." : "Listening..."}
              </span>
            </div>
            
            <Button
              onClick={endConversation}
              size="lg"
              variant="destructive"
              className="w-full max-w-md"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              End Conversation
            </Button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="text-center text-sm text-muted-foreground">
          <p>The AI agent will ask you questions about your claim.</p>
          <p>Speak clearly and wait for the agent to finish before responding.</p>
        </div>
      )}
    </div>
  );
};

export default VoiceAgent;
