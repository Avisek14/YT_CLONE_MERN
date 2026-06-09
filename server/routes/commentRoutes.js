import express from "express"
import Comment from "../models/Comment.js"
import Video from "../models/Video.js"
import authMiddleware from "../middleware/authMiddleware.js"
import { normalizeAvatarUrl } from "../utils/helpers.js"

const router = express.Router()

// ==================== NORMALIZE COMMENT ====================
const normalizeCommentResponse = (commentDoc) => {
    const comment = commentDoc.toObject ? commentDoc.toObject() : { ...commentDoc }

    if (comment.userId) {
        comment.userId.avatar = normalizeAvatarUrl(
            comment.userId.avatar,
            comment.userId.username,
        )
    }

    return comment
}

// ==================== GET COMMENTS ====================
// GET /api/comments/:videoId
router.get("/:videoId", async (req, res) => {
    try {
        const { videoId } = req.params

        if (!videoId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(videoId)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        const comments = await Comment.find({ videoId })
            .populate("userId", "username avatar userId")
            .sort({ timestamp: -1 })

        res.status(200).json({
            success: true,
            message: "Comments retrieved successfully.",
            comments: comments.map(normalizeCommentResponse),
        })
    } catch (error) {
        console.error("Get comments error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to retrieve comments.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== ADD COMMENT ====================
// POST /api/comments/:videoId (protected)
router.post("/:videoId", authMiddleware, async (req, res) => {
    try {
        const { videoId } = req.params
        const { text } = req.body
        const userId = req.user.userId

        if (!text || typeof text !== "string") {
            return res.status(400).json({
                success: false,
                message: "Comment text is required and must be a string.",
            })
        }

        const trimmedText = text.trim()

        if (trimmedText.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot be empty.",
            })
        }

        if (trimmedText.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Comment must not exceed 1000 characters.",
            })
        }

        if (!videoId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID format.",
            })
        }

        const video = await Video.findById(videoId)

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            })
        }

        const commentId = `com_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`

        const newComment = new Comment({
            commentId,
            videoId,
            userId,
            text: trimmedText,
            timestamp: new Date(),
        })

        await newComment.save()

        video.comments.push(newComment._id)
        await video.save()

        await newComment.populate("userId", "username avatar userId")

        res.status(201).json({
            success: true,
            message: "Comment added successfully.",
            comment: normalizeCommentResponse(newComment),
        })
    } catch (error) {
        console.error("Add comment error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to add comment.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== UPDATE COMMENT ====================
// PUT /api/comments/:commentId (protected, author only)
router.put("/:commentId", authMiddleware, async (req, res) => {
    try {
        const { commentId } = req.params
        const { text } = req.body
        const userId = req.user.userId

        if (!text || typeof text !== "string") {
            return res.status(400).json({
                success: false,
                message: "Comment text is required and must be a string.",
            })
        }

        const trimmedText = text.trim()

        if (trimmedText.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot be empty.",
            })
        }

        if (trimmedText.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Comment must not exceed 1000 characters.",
            })
        }

        if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid comment ID format.",
            })
        }

        const comment = await Comment.findById(commentId)

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found.",
            })
        }

        if (comment.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only edit your own comments.",
            })
        }

        comment.text = trimmedText
        await comment.save()

        await comment.populate("userId", "username avatar userId")

        res.status(200).json({
            success: true,
            message: "Comment updated successfully.",
            comment: normalizeCommentResponse(comment),
        })
    } catch (error) {
        console.error("Update comment error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to update comment.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

// ==================== DELETE COMMENT ====================
// DELETE /api/comments/:commentId (protected, author only)
router.delete("/:commentId", authMiddleware, async (req, res) => {
    try {
        const { commentId } = req.params
        const userId = req.user.userId

        if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid comment ID format.",
            })
        }

        const comment = await Comment.findById(commentId)

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found.",
            })
        }

        if (comment.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own comments.",
            })
        }

        await Video.findByIdAndUpdate(comment.videoId, {
            $pull: { comments: commentId },
        })

        await Comment.findByIdAndDelete(commentId)

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully.",
        })
    } catch (error) {
        console.error("Delete comment error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to delete comment.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
})

export default router