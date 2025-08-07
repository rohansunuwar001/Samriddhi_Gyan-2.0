import express from 'express';
import { getSearchResults } from '../controllers/course.controller.js';


const searchRouter = express.Router();

// Maps GET requests to / to the getSearchResults function
searchRouter.get('/', getSearchResults);

export default searchRouter;