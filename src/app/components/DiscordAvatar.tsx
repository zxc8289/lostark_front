"use client";

import { useState } from "react";

const DEFAULT_DISCORD_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

type DiscordAvatarProps = {
    src?: string | null;
    alt?: string;
    className?: string;
};

export default function DiscordAvatar({
    src,
    alt = "",
    className,
}: DiscordAvatarProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const imageSrc = src && !imageFailed ? src : DEFAULT_DISCORD_AVATAR_URL;

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
        />
    );
}
