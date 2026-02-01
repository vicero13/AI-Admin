export default function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
      <p className="text-sm text-gray-500">
        Manage your AI assistant configuration, knowledge base, and dialog examples.
      </p>
      <div className="ml-auto text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
        Changes may require server restart
      </div>
    </header>
  );
}
