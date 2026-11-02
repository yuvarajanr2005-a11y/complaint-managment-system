/**
 * Default Campus Care Constants
 * Used as initial fallbacks before live configuration loads from the database.
 */

export const defaultCategories = [
  'Academics',
  'Facilities',
  'Hostel',
  'Transport',
  'Cafeteria',
  'Other',
];

export const statuses = ['Submitted', 'In Review', 'Resolved', 'Rejected'];

export const defaultDepartments = [
  'Academics',
  'Facilities',
  'Hostel',
  'Transport',
  'Cafeteria',
  'Student Affairs',
];

export const emptyForm = {
  title: '',
  category: 'Facilities',
  priority: 'Medium',
  description: '',
  attachment: null,
};

export const defaultSuggestions = [
  { title: 'Classroom fan or lights are not working', category: 'Facilities' },
  { title: 'Projector or classroom equipment is not working', category: 'Facilities' },
  { title: 'Hostel water or room maintenance problem', category: 'Hostel' },
  { title: 'College bus is late or overcrowded', category: 'Transport' },
  { title: 'Cafeteria food quality or cleanliness issue', category: 'Cafeteria' },
  { title: 'Need help with an academic issue', category: 'Academics' },
];

export const demoAccounts = {
  student: { email: 'student@mycollege.demo', password: 'Student123!' },
  admin: { email: 'admin@mycollege.demo', password: 'Admin123!' },
  committee: { email: 'committee@mycollege.demo', password: 'Committee123!' },
  hodPassword: 'Hod12345!',
};
