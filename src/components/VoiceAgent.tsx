import { useEffect, useRef } from "react";

const VoiceAgent = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the ElevenLabs widget script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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
