export function useDateTime() {
    const dateTime = (value) => {
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        }).format(value);
    };

    return { dateTime };
}
