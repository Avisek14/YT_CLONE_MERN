/**
 * Validation utilities for user input
 * Provides reusable validators for username, email, and password
 */

// ==================== USERNAME ====================
const validateUsername = (username) => {
    if (!username || typeof username !== "string") {
        return { isValid: false, error: "Username is required and must be a string." }
    }

    const trimmed = username.trim()

    if (trimmed.length < 3) {
        return { isValid: false, error: "Username must be at least 3 characters long." }
    }

    if (trimmed.length > 20) {
        return { isValid: false, error: "Username must not exceed 20 characters." }
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(trimmed)) {
        return {
            isValid: false,
            error: "Username can only contain letters, numbers, underscores, and hyphens.",
        }
    }

    return { isValid: true, error: null }
}

// ==================== EMAIL ====================
const validateEmail = (email) => {
    if (!email || typeof email !== "string") {
        return { isValid: false, error: "Email is required and must be a string." }
    }

    const trimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(trimmed)) {
        return { isValid: false, error: "Please provide a valid email address." }
    }

    if (trimmed.length > 254) {
        return { isValid: false, error: "Email is too long." }
    }

    const [localPart] = trimmed.split("@")
    if (localPart.length > 64) {
        return { isValid: false, error: "Email local part (before @) is too long." }
    }

    return { isValid: true, error: null }
}

// ==================== PASSWORD ====================
const validatePassword = (password, options = {}) => {
    const { minLength = 6 } = options

    if (!password || typeof password !== "string") {
        return { isValid: false, error: "Password is required and must be a string." }
    }

    if (password.length < minLength) {
        return { isValid: false, error: `Password must be at least ${minLength} characters long.` }
    }

    if (password.length > 128) {
        return { isValid: false, error: "Password is too long." }
    }

    return { isValid: true, error: null }
}

// ==================== REGISTRATION ====================
const validateRegistration = (data, options = {}) => {
    const errors = {}

    const usernameValidation = validateUsername(data.username)
    if (!usernameValidation.isValid) {
        errors.username = usernameValidation.error
    }

    const emailValidation = validateEmail(data.email)
    if (!emailValidation.isValid) {
        errors.email = emailValidation.error
    }

    const passwordValidation = validatePassword(data.password, options)
    if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error
    }

    const isValid = Object.keys(errors).length === 0
    return { isValid, errors }
}

// ==================== LOGIN ====================
const validateLogin = (data) => {
    const errors = {}

    const emailValidation = validateEmail(data.email)
    if (!emailValidation.isValid) {
        errors.email = emailValidation.error
    }

    if (!data.password || typeof data.password !== "string") {
        errors.password = "Password is required."
    }

    const isValid = Object.keys(errors).length === 0
    return { isValid, errors }
}

// ==================== VIDEO ====================
const validateVideo = (data) => {
    const errors = {}

    if (!data.title || typeof data.title !== "string") {
        errors.title = "Video title is required and must be a string."
    } else if (data.title.trim().length < 3) {
        errors.title = "Video title must be at least 3 characters long."
    } else if (data.title.trim().length > 200) {
        errors.title = "Video title must not exceed 200 characters."
    }

    if (data.description && typeof data.description !== "string") {
        errors.description = "Description must be a string."
    } else if (data.description && data.description.trim().length > 5000) {
        errors.description = "Description must not exceed 5000 characters."
    }

    if (!data.videoUrl || typeof data.videoUrl !== "string") {
        errors.videoUrl = "Video URL is required and must be a string."
    } else if (!isValidUrl(data.videoUrl)) {
        errors.videoUrl = "Video URL must be a valid URL."
    }

    if (!data.thumbnailUrl || typeof data.thumbnailUrl !== "string") {
        errors.thumbnailUrl = "Thumbnail URL is required and must be a string."
    } else if (!isValidUrl(data.thumbnailUrl)) {
        errors.thumbnailUrl = "Thumbnail URL must be a valid URL."
    }

    if (!data.channelId || typeof data.channelId !== "string") {
        errors.channelId = "Channel ID is required and must be a string."
    } else if (!data.channelId.trim()) {
        errors.channelId = "Channel ID is required."
    }

    const validCategories = [
        "Music", "Gaming", "Education",
        "Entertainment", "Sports", "Tech", "Other",
    ]
    if (data.category && !validCategories.includes(data.category)) {
        errors.category = `Category must be one of: ${validCategories.join(", ")}`
    }

    const isValid = Object.keys(errors).length === 0
    return { isValid, errors }
}

// ==================== CHANNEL ====================
const validateChannel = (data) => {
    const errors = {}

    if (!data.channelName || typeof data.channelName !== "string") {
        errors.channelName = "Channel name is required and must be a string."
    } else if (data.channelName.trim().length < 3) {
        errors.channelName = "Channel name must be at least 3 characters long."
    } else if (data.channelName.trim().length > 100) {
        errors.channelName = "Channel name must not exceed 100 characters."
    }

    if (data.description && typeof data.description !== "string") {
        errors.description = "Description must be a string."
    } else if (data.description && data.description.trim().length > 5000) {
        errors.description = "Description must not exceed 5000 characters."
    }

    if (data.channelBanner && typeof data.channelBanner !== "string") {
        errors.channelBanner = "Channel banner must be a string."
    } else if (data.channelBanner && !isValidUrl(data.channelBanner)) {
        errors.channelBanner = "Channel banner must be a valid URL."
    }

    const isValid = Object.keys(errors).length === 0
    return { isValid, errors }
}

// ==================== URL HELPER ====================
const isValidUrl = (url) => {
    try {
        new URL(url)
        return true
    } catch (error) {
        return false
    }
}

export {
    validateUsername,
    validateEmail,
    validatePassword,
    validateRegistration,
    validateLogin,
    validateVideo,
    validateChannel,
}