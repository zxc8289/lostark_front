// Card.jsx
import clsx from "clsx";

export default function Card({
    title,
    children,
    className,
}: { title?: string; children: React.ReactNode; className?: string }) {
    return (
        <section
            className={clsx(
                "bg-[#2d333b] border border-[#444c56] rounded-lg",
                "flex flex-col",
                className
            )}
        >
            {title && (
                <header className="px-4 py-3 border-b border-[#444c56] text-sm font-semibold text-gray-300">
                    {title}
                </header>
            )}
            <div className="p-5 flex-1 flex items-center">{children}</div>
        </section>
    );
}