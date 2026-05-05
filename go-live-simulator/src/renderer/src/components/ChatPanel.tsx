import type { ChatMessage } from "../game/types";

export function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  return (
    <aside className="chat-panel">
      <div className="panel-title">Live Chat</div>
      <div className="chat-scroll">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message chat-${message.kind}`}>
            <strong>{message.user}</strong>
            <span>{message.text}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
