'use client';

import { useEffect, useRef } from 'react';

type Props = {
    slot: string;
    className?: string;
    responsive?: boolean;
};

const GoogleAd = ({ slot, className = "", responsive = true }: Props) => {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const element = elementRef.current;
                    if (element && entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
                        const computedStyle = window.getComputedStyle(element);
                        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return;

                        const insElement = element.querySelector('ins');
                        if (insElement && insElement.getAttribute('data-ad-status') === 'filled') return;

                        try {
                            (window as any).adsbygoogle = (window as any).adsbygoogle || [];
                            (window as any).adsbygoogle.push({});
                            observer.unobserve(element);
                        } catch (err) { }
                    }
                });
            },
            { threshold: 0 }
        );

        if (elementRef.current) observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, [slot]);

    return (
        <div
            ref={elementRef}
            className={`w-full flex justify-center items-center overflow-hidden relative ${className}`}
            style={{ backgroundColor: '#2f3238' }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 select-none pointer-events-none">
                <span className="text-[10px] font-bold tracking-widest border border-gray-600 px-2 py-0.5 rounded">AD</span>
            </div>

            <ins
                className="adsbygoogle relative z-10"
                style={{ display: 'block', width: '100%', height: '100%', maxHeight: '100%' }}
                data-ad-client="ca-pub-1712313315461589"
                data-ad-slot={slot}
                data-ad-format={responsive ? null : undefined}
                data-full-width-responsive="false"
            />
        </div>
    );
};

export default GoogleAd;