import { useState } from 'react';
import { askGrok } from '../../services/aiService';

export default function Chatbot({ folderContext = '' }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about your study material.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = `You are StudiFi tutor. Answer the student's question based strictly on this document context:\n${folderContext.slice(0, 10000)}`;
      const aiReply = await askGrok(newMessages.filter(m => m.role !== 'system'), systemPrompt);
      setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to fetch reply from Grok.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-700 bg-gray-900/60 backdrop-blur rounded-xl p-4 text-white">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m, idx) => (
          <div key={idx} className={`p-3 rounded-lg max-w-[80%] text-sm ${m.role === 'user' ? 'ml-auto bg-blue-600' : 'mr-auto bg-gray-800'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">Grok is thinking...</div>}
      </div>
      <form onSubmit={sendMessage} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
          Send
        </button>
      </form>
    </div>
  );
}