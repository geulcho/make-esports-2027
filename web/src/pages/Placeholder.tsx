interface Props { title: string; description?: string; }

export function Placeholder({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-xl font-bold text-slate-300 mb-2">{title}</h2>
      <p className="text-slate-500 text-sm">{description ?? 'Coming soon'}</p>
    </div>
  );
}
