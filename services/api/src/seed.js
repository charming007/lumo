const repository = require('./repository');

function getSeedSummary() {
  return {
    centers: repository.listCenters().length,
    cohorts: repository.listCohorts().length,
    teachers: repository.listTeachers().length,
    students: repository.listStudents().length,
    lessons: repository.listLessons().length,
    assignments: repository.listAssignments().length,
  };
}

module.exports = {
  getSeedSummary,
};
