// ==================== HELPERS ====================

export function buildAvatarUrl(name = "Avatar") {
    const initials = getInitials(name)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0284c7&color=f8fafc&size=160&bold=true`
}

export function buildChannelBannerUrl(label = "Channel Banner") {
    return `https://via.placeholder.com/1280x320/0f172a/f8fafc?text=${encodeURIComponent(label)}`
}

export function normalizeAvatarUrl(avatar, name = "Avatar") {
    if (!avatar || avatar.includes("via.placeholder.com")) {
        return buildAvatarUrl(name)
    }
    return avatar
}

export function normalizeChannelBannerUrl(channelBanner, label = "Channel Banner") {
    if (!channelBanner || channelBanner.includes("via.placeholder.com")) {
        return buildChannelBannerUrl(label)
    }
    return channelBanner
}

export function getYouTubeVideoId(url) {
    if (!url || typeof url !== "string") return null
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
}

export function getThumbnailUrl(videoUrl) {
    const videoId = getYouTubeVideoId(videoUrl)
    if (!videoId) return null
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function normalizeThumbnailUrl(thumbnailUrl, videoUrl) {
    const safeThumbnailUrl = getThumbnailUrl(videoUrl)

    if (!thumbnailUrl || thumbnailUrl.includes("maxresdefault.jpg")) {
        return safeThumbnailUrl
    }

    return thumbnailUrl.includes("img.youtube.com/vi/")
        ? thumbnailUrl.replace("https://img.youtube.com/vi/", "https://i.ytimg.com/vi/")
        : thumbnailUrl
}

// ==================== HELPER FUNCTIONS ====================

function getInitials(name = "Avatar") {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "A"
}