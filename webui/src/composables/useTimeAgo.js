export function useTimeAgo() {
    const timeago = (date) => {
        const now = new Date();
        const diff = now - date;

        if (diff < 1000) {
            return "just now";
        } else if (diff < 60000) {
            const seconds = Math.floor(diff / 1000);
            return `${seconds} ${plural("second", seconds)} ago`;
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} ${plural("minute", minutes)} ago`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} ${plural("hour", hours)} ago`;
        } else {
            const days = Math.floor(diff / 86400000);
            return `${days} ${plural("day", days)} ago`;
        }
    };

    // #278 -- this function might need to be rewritten to support l18n
    const plural = (word, count) => {
        return count !== 1 ? `${word}s` : word;
    };

    return { timeago };
}
