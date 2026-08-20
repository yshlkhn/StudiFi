import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const formatTimeAgo = (date) => {
    if (!date) return "";

    // ✅ FORCE UTC
    const created = new Date(date + "Z");
    const now = new Date();

    const diffMs = now - created;
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return created.toLocaleDateString();
};