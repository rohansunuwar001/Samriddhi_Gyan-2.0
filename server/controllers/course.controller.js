import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { SearchSuggestion } from "../models/searchSuggestion.js";
import { User } from "../models/user.model.js";
import {
  deleteMediaFromCloudinary,
  deleteVideoFromCloudinary,
  uploadMedia,
} from "../utils/cloudinary.js";

export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;
    if (!courseTitle || !category) {
      return res.status(400).json({
        message: "Course title and category is required.",
      });
    }

    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      course,
      message: "Course created.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create course",
    });
  }
};

export const searchCourse = async (req, res) => {
  try {
    const { query = "", categories = [], sortByPrice = "" } = req.query;
    console.log(categories);

    // create search query
    const searchCriteria = {
      isPublished: true,
      $or: [
        { courseTitle: { $regex: query, $options: "i" } },
        { subTitle: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    };

    // if categories selected
    if (categories.length > 0) {
      searchCriteria.category = { $in: categories };
    }

    // define sorting order
    const sortOptions = {};
    if (sortByPrice === "low") {
      sortOptions.coursePrice = 1; //sort by price in ascending
    } else if (sortByPrice === "high") {
      sortOptions.coursePrice = -1; // descending
    }

    let courses = await Course.find(searchCriteria)
      .populate({ path: "creator", select: "name photoUrl" })
      .sort(sortOptions);

    return res.status(200).json({
      success: true,
      courses: courses || [],
    });
  } catch (error) {
    console.log(error);
  }
};



/**
 * @desc    Get comprehensive search results based on a query
 * @route   GET /api/search?q=your_query
 * @access  Public
 */
export const getSearchResults = async (req, res) => {
  try {
    const { q } = req.query;

    // Return empty results if the query is missing or empty
    if (!q || q.trim() === '') {
      return res.status(200).json({ suggestions: [], courses: [] });
    }

    // Sanitize the query to prevent Regex Injection attacks
    const sanitizedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(sanitizedQuery, 'i'); // 'i' for case-insensitivity

    // Run both database lookups in parallel for maximum efficiency
    const [courses, suggestionDocs] = await Promise.all([
      // --- Query 1: Find Courses using the Aggregation Pipeline ---
      Course.aggregate([
        // Stage 1: Initial match to filter for only published courses.
        // This is a crucial performance optimization.
        {
          $match: { isPublished: true }
        },
        // Stage 2: Join with the 'users' collection to get creator's name
        {
          $lookup: {
            from: 'users', // The name of the users collection
            localField: 'creator',
            foreignField: '_id',
            as: 'creatorInfo'
          }
        },
        // Stage 3: Deconstruct the creatorInfo array to an object
        {
          $unwind: {
            path: '$creatorInfo',
            preserveNullAndEmptyArrays: true // Keep courses even if creator is not found
          }
        },
        // Stage 4: Match against all relevant fields
        {
          $match: {
            $or: [
              { courseTitle: searchRegex },
              { subTitle: searchRegex },
              { category: searchRegex },
              { 'creatorInfo.name': searchRegex } // Search by the creator's name
            ]
          }
        },
        // Stage 5: Limit the number of results
        {
          $limit: 5
        },
        // Stage 6: Project only the fields needed by the frontend for a smaller payload
        {
          $project: {
            _id: 1, // The course ID is needed for the link
            title: '$courseTitle', // Rename for consistency
            thumbnail: '$courseThumbnail',
            creatorName: '$creatorInfo.name' // Send only the creator's name
          }
        }
      ]),

      // --- Query 2: Find Search Suggestions ---
      SearchSuggestion.find({ term: searchRegex }).limit(8).lean()
    ]);

    // Format suggestions into a simple array of strings
    const suggestions = suggestionDocs.map(s => s.term);

    // Send the final, combined results
    res.status(200).json({ suggestions, courses });

  } catch (error) {
    console.error('Search controller error:', error);
    res.status(500).json({ message: 'Server error during search.' });
  }
};

export const getPublishedCourse = async (_, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).populate({
      path: "creator",
      select: "name photoUrl",
    });
    if (!courses) {
      return res.status(404).json({
        message: "Course not found",
      });
    }
    return res.status(200).json({
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get published courses",
    });
  }
};
export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.id;
    const courses = await Course.find({ creator: userId });
    if (!courses) {
      return res.status(404).json({
        courses: [],
        message: "Course not found",
      });
    }
    return res.status(200).json({
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create course",
    });
  }
};
export const editCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const {
      courseTitle,
      subTitle,
      description,
      category,
      courseLevel,
      coursePrice,
    } = req.body;
    const thumbnail = req.file;

    let course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }
    let courseThumbnail;
    if (thumbnail) {
      if (course.courseThumbnail) {
        const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
        await deleteMediaFromCloudinary(publicId); // delete old image
      }
      // upload a thumbnail on clourdinary
      courseThumbnail = await uploadMedia(thumbnail.path);
    }

    const updateData = {
      courseTitle,
      subTitle,
      description,
      category,
      courseLevel,
      coursePrice,
      courseThumbnail: courseThumbnail?.secure_url,
    };

    course = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
    });

    return res.status(200).json({
      course,
      message: "Course updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create course",
    });
  }
};
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }
    return res.status(200).json({
      course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get course by id",
    });
  }
};

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    const { courseId } = req.params;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({
        message: "Lecture title is required",
      });
    }

    // create lecture
    const lecture = await Lecture.create({ lectureTitle });

    const course = await Course.findById(courseId);
    if (course) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(201).json({
      lecture,
      message: "Lecture created successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create lecture",
    });
  }
};
export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }
    return res.status(200).json({
      lectures: course.lectures,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get lectures",
    });
  }
};
export const editLecture = async (req, res) => {
  try {
    const { lectureTitle, videoInfo, isPreviewFree } = req.body;

    const { courseId, lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }

    // update lecture
    if (lectureTitle) lecture.lectureTitle = lectureTitle;
    if (videoInfo?.videoUrl) lecture.videoUrl = videoInfo.videoUrl;
    if (videoInfo?.publicId) lecture.publicId = videoInfo.publicId;
    lecture.isPreviewFree = isPreviewFree;

    await lecture.save();

    // Ensure the course still has the lecture id if it was not aleardy added;
    const course = await Course.findById(courseId);
    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save();
    }
    return res.status(200).json({
      lecture,
      message: "Lecture updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to edit lectures",
    });
  }
};
export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findByIdAndDelete(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }
    // delete the lecture from couldinary as well
    if (lecture.publicId) {
      await deleteVideoFromCloudinary(lecture.publicId);
    }

    // Remove the lecture reference from the associated course
    await Course.updateOne(
      { lectures: lectureId }, // find the course that contains the lecture
      { $pull: { lectures: lectureId } } // Remove the lectures id from the lectures array
    );

    return res.status(200).json({
      message: "Lecture removed successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to remove lecture",
    });
  }
};
export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }
    return res.status(200).json({
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get lecture by id",
    });
  }
};

// publich unpublish course logic

export const togglePublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { publish } = req.query; // true, false
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }
    // publish status based on the query paramter
    course.isPublished = publish === "true";
    await course.save();

    const statusMessage = course.isPublished ? "Published" : "Unpublished";
    return res.status(200).json({
      message: `Course is ${statusMessage}`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to update status",
    });
  }
};

export const getRecommendedCourses = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    let userId = null;

    if (token) {
      try {
        const decode = jwt.verify(token, process.env.SECRET_KEY);
        userId = decode?.userId;
      } catch (err) {
        console.warn("Invalid or expired token. Proceeding as guest.");
      }
    }
    if (userId) {
      const user = await User.findById(userId).populate("enrolledCourses");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const enrolledCourses = user.enrolledCourses;

      if (enrolledCourses.length === 0) {
        const popularCourses = await Course.find({ isPublished: true })
          .sort({ enrolledStudents: -1 })
          .limit(5);

        return res.json({
          message:
            "You haven't enrolled in any courses yet. Here are some popular ones.",
          recommendedCourses: popularCourses,
        });
      }

      const categories = [...new Set(enrolledCourses.map((c) => c.category))];

      const enrolledCourseIds = enrolledCourses.map((course) =>
        course._id.toString()
      );

      let recommendedCourses = await Course.find({
        isPublished: true,
        category: { $in: categories },
        _id: { $nin: enrolledCourseIds },
      })
        .sort({ enrolledStudents: -1 })
        .limit(5);

      if (recommendedCourses.length === 0) {
        recommendedCourses = await Course.find({
          isPublished: true,
          _id: { $nin: enrolledCourseIds },
        })
          .sort({ enrolledStudents: -1 })
          .limit(5);

        return res.json({
          message:
            "No similar category courses found. Here are some other popular ones.",
          recommendedCourses,
        });
      }

      return res.json({
        message: "Recommended based on your interests",
        recommendedCourses,
      });
    }

    const popularCourses = await Course.find({ isPublished: true })
      .sort({ enrolledStudents: -1 })
      .limit(5);

    return res.json({
      message: "Here are some popular courses you may like.",
      recommendedCourses: popularCourses,
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
