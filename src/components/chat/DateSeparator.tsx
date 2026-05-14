type Props = {
  label: string;
};

export default function DateSeparator({ label }: Props) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-gk-border" />
      <span className="text-gk-muted text-[12px] flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gk-border" />
    </div>
  );
}
