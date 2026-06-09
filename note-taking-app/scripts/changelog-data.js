/**
 * Qnex Changelog Data Configuration
 * 
 * Edit this file to add, modify, or remove version updates.
 * The settings panel will automatically generate the timeline axis,
 * vertical snap points, and update details based on this structure.
 * 
 * Structure:
 * "VERSION_KEY": {
 *   version: "Display Name of Version",
 *   badge: "Badges like 'NEW UPDATE', 'BETA', 'TESTING', 'STABLE'",
 *   date: "Release Date description",
 *   details: [
 *     { 
 *       type: "reworked" | "added" | "improved" | "fixed", 
 *       title: "Feature Title", 
 *       description: "Detailed description of the changes." 
 *     }
 *   ]
 * }
 */
export const changelogData = {
  "X.40": {
    version: "Version X.40",
    badge: "NEW UPDATE",
    date: "Upcoming Release",
    details: [
      {
        type: "reworked",
        title: "Statistics in Qbank",
        description: "Overhauled qbank analytics dashboard for better performance metrics, visual feedback, and progress tracking."
      },
      {
        type: "reworked",
        title: "PDF Viewer",
        description: "Completely rebuilt document viewer for faster loading, native annotation overlays, and improved navigation."
      },
      {
        type: "improved",
        title: "Minor App Changes",
        description: "Under-the-hood performance optimizations, UI alignment polish, and various bug fixes."
      }
    ]
  },
  "X.41": {
    version: "Version X.41",
    badge: "TESTING",
    date: "Development Phase",
    details: []
  },
  "X.42": {
    version: "Version X.42",
    badge: "TESTING",
    date: "Development Phase",
    details: []
  },
  "X.43": {
    version: "Version X.43",
    badge: "TESTING",
    date: "Development Phase",
    details: []
  },
  "X.44": {
    version: "Version X.44",
    badge: "TESTING",
    date: "Development Phase",
    details: []
  }
};

export default changelogData;
