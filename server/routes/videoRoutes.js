import express from "express"
import Video from "../models/Video.js"
import Channel from "../models/Channel.js"
import authMiddleware from "../middleware/authMiddleware.js"
import { validateVideo } from "../utils/validators.js"
import {
    getThumbnailUrl,
    normalizeAvatarUrl,
    normalizeChannelBannerUrl,
    normalizeThumbnailUrl,
} from "../utils/helpers.js"

const router = express.Router()

// ==================== NORMALIZE VIDEO ====================
const normalizeVideoResponse = (videoDoc) => {
    const video = videoDoc.toObject ? videoDoc.toObject() : { ...videoDoc }

    video.thumbnailUrl = normalizeThumbnailUrl(video.thumbnailUrl, video.videoUrl)

    if (video.uploader) {
        video.uploader.avatar = normalizeAvatarUrl(
            video.uploader.avatar,
            video.uploader.username,
        )
    }

    if (video.channelId) {
        video.channelId.channelBanner = normalizeChannelBannerUrl(
            video.channelId.channelBanner,
            video.channelId.channelName,
        )
    }

    if (Array.isArray(video.comments)) {
        video.comments = video.comments.map((comment) => {
            const normalizedComment = comment.toObject
                ? comment.toObject()
                : { ...comment }

            if (normalizedComment.userId) {
                normalizedComment.userId.avatar = normalizeAvatarUrl(
                    normalizedComment.userId.avatar,
                    normalizedComment.userId.username,
                )
            }

            return normalizedComment
        })
    }

    return video
}

// ==================== GET ALL VIDEOS ====================
// GET /api/videos
router.get("/", async (req, res) => {
    try {
        const { search, category, page = 1, limit = 10 } = req.query

        const filter = {}

        if (search) {
            filter.title = { $regex: search, $options: "i" }
        }

        if (category) {
            filter.category = category
        }

        const videos = await Video.find(filter)
            .populate("uploader", "username avatar userId")
            .populate("channelId", "channelName channelBanner owner")
            .limit(parseInt(limit))
            .sort({ uploadDate: -1 })

        const total = await Video.countDocuments(filter)

        res.status(200).json({
            success: true,
            message: "Videos retrieved successfully.",
            videos: videos.map(normalizeVideoResponse),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error("Get videos error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to retrieve videos.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== GET SINGLE VIDEO ====================
// GET /api/videos/:id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findByIdAndUpdate(
            id,
            { $inc: { views: 1 } },
            { returnDocument: "after" },
        )
            .populate("uploader", "username avatar userId email")
            .populate("channelId", "channelName channelBanner subscribers owner")
            .populate({
                path: "comments",
                populate: {
                    path: "userId",
                    select: "username avatar",
                },
            })

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        res.status(200).json({
            success: true,
            message: "Video retrieved successfully.",
            video: normalizeVideoResponse(video),
        })
    } catch (error) {
        console.error("Get video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to retrieve video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== CREATE VIDEO ====================
// POST /api/videos (protected)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { title, description, videoUrl, channelId, category } = req.body
        const userId = req.user.userId
        const normalizedChannelId = channelId?.trim()

        if (!videoUrl || typeof videoUrl !== "string" || videoUrl.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Video URL is required and must be a valid string.",
                errors: { videoUrl: "Must provide a valid YouTube URL" },
            })
        }

        const generatedThumbnail = getThumbnailUrl(videoUrl.trim())

        if (!generatedThumbnail) {
            return res.status(400).json({
                success: false,
                message: "Invalid YouTube URL. Could not extract thumbnail.",
                errors: { videoUrl: "Please provide a valid YouTube URL" },
            })
        }

        const validation = validateVideo({
            title,
            description,
            videoUrl,
            thumbnailUrl: generatedThumbnail,
            channelId: normalizedChannelId,
            category,
        })

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed. Please check the errors below.",
                errors: validation.errors,
            })
        }

        const channel = await Channel.findOne({
            $or: [
                { channelId: normalizedChannelId },
                ...(normalizedChannelId?.match(/^[0-9a-fA-F]{24}$/)
                    ? [{ _id: normalizedChannelId }]
                    : []),
            ],
        })

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: "Channel not found.",
            })
        }

        if (channel.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only upload videos to channels you own.",
            })
        }

        const videoId = `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const newVideo = new Video({
            videoId,
            title: title.trim(),
            description: description?.trim() || "",
            videoUrl,
            thumbnailUrl: generatedThumbnail,
            channelId: channel._id,
            uploader: userId,
            category,
        })

        await newVideo.save()

        channel.videos.push(newVideo._id)
        await channel.save()

        await newVideo.populate("uploader", "username avatar userId")
        await newVideo.populate("channelId", "channelName channelBanner")

        res.status(201).json({
            success: true,
            message: "Video created successfully.",
            video: normalizeVideoResponse(newVideo),
        })
    } catch (error) {
        console.error("Create video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to create video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== UPDATE VIDEO ====================
// PUT /api/videos/:id (protected, owner only)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const { title, description, category, thumbnailUrl } = req.body
        const userId = req.user.userId

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(id)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        if (video.uploader.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own videos.",
            })
        }

        const updates = {}

        if (title) {
            if (title.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Video title must be at least 3 characters long.",
                })
            }
            updates.title = title.trim()
        }

        if (description !== undefined) {
            updates.description = description.trim()
        }

        if (category) {
            const validCategories = [
                "Music", "Gaming", "Education",
                "Entertainment", "Sports", "Tech", "Other",
            ]
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Category must be one of: ${validCategories.join(", ")}`,
                })
            }
            updates.category = category
        }

        if (thumbnailUrl) {
            updates.thumbnailUrl = thumbnailUrl
        }

        const updatedVideo = await Video.findByIdAndUpdate(id, updates, {
            returnDocument: "after",
        })
            .populate("uploader", "username avatar userId")
            .populate("channelId", "channelName channelBanner")

        res.status(200).json({
            success: true,
            message: "Video updated successfully.",
            video: normalizeVideoResponse(updatedVideo),
        })
    } catch (error) {
        console.error("Update video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to update video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== DELETE VIDEO ====================
// DELETE /api/videos/:id (protected, owner only)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(id)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        if (video.uploader.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own videos.",
            })
        }

        await Channel.findByIdAndUpdate(video.channelId, {
            $pull: { videos: id },
        })

        await Video.findByIdAndDelete(id)

        res.status(200).json({
            success: true,
            message: "Video deleted successfully.",
        })
    } catch (error) {
        console.error("Delete video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to delete video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== LIKE VIDEO ====================
// PUT /api/videos/:id/like (protected)
router.put("/:id/like", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(id)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        const userIndex = video.likedBy?.indexOf(userId) ?? -1

        if (userIndex > -1) {
            video.likedBy.splice(userIndex, 1)
            video.likes = Math.max(0, video.likes - 1)
        } else {
            if (!video.likedBy) video.likedBy = []
            video.likedBy.push(userId)
            video.likes += 1

            const dislikeIndex = video.dislikedBy?.indexOf(userId) ?? -1
            if (dislikeIndex > -1) {
                video.dislikedBy.splice(dislikeIndex, 1)
                video.dislikes = Math.max(0, video.dislikes - 1)
            }
        }

        await video.save()

        res.status(200).json({
            success: true,
            message: userIndex > -1 ? "Like removed." : "Video liked.",
            video,
        })
    } catch (error) {
        console.error("Like video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to like video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== DISLIKE VIDEO ====================
// PUT /api/videos/:id/dislike (protected)
router.put("/:id/dislike", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(id)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        const userIndex = video.dislikedBy?.indexOf(userId) ?? -1

        if (userIndex > -1) {
            video.dislikedBy.splice(userIndex, 1)
            video.dislikes = Math.max(0, video.dislikes - 1)
        } else {
            if (!video.dislikedBy) video.dislikedBy = []
            video.dislikedBy.push(userId)
            video.dislikes += 1

            const likeIndex = video.likedBy?.indexOf(userId) ?? -1
            if (likeIndex > -1) {
                video.likedBy.splice(likeIndex, 1)
                video.likes = Math.max(0, video.likes - 1)
            }
        }

        await video.save()

        res.status(200).json({
            success: true,
            message: userIndex > -1 ? "Dislike removed." : "Video disliked.",
            video,
        })
    } catch (error) {
        console.error("Dislike video error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to dislike video.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

export default router