import { useEffect, useRef } from "react";

interface VoiceAgentProps {
  onConversationEnd?: () => void;
}

const VoiceAgent = ({ onConversationEnd }: VoiceAgentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Load the ElevenLabs widget script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    // Set up fallback timer (5 minutes)
    if (onConversationEnd) {
      fallbackTimerRef.current = setTimeout(() => {
        console.log("Conversation timeout reached");
        onConversationEnd();
      }, 5 * 60 * 1000);
    }

    // Listen for any potential widget events
    const handleMessage = (event: MessageEvent) => {
      // Check for ElevenLabs widget events
      if (event.data?.type === "elevenlabs-conversation-end" || 
          event.data?.event === "conversation-ended") {
        console.log("Conversation ended via event");
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        onConversationEnd?.();
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      window.removeEventListener("message", handleMessage);
    };
  }, [onConversationEnd]);

  return (
    <div ref={containerRef} className="w-full">
      <elevenlabs-convai agent-id="agent_4901k9f8wvw3emx80zw8ybxvqkdp" />
    </div>
  );
};

// Declare custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "agent-id": string;
        },
        HTMLElement
      >;
    }
  }
}

export default VoiceAgent;
