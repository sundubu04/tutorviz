import { apiClient, type Class as ApiClass } from '../utils/apiClient';
import { createIconElement } from '../utils/iconMapper';
import { type Class } from '../types';

export class ClassesService {
  private static instance: ClassesService;

  private constructor() {}

  public static getInstance(): ClassesService {
    if (!ClassesService.instance) {
      ClassesService.instance = new ClassesService();
    }
    return ClassesService.instance;
  }

  async fetchClasses(): Promise<Class[]> {
    try {
      let classesResponse;
      if (apiClient.isAuthenticated()) {
        classesResponse = await apiClient.getClasses();
      } else {
        // If not authenticated, still fetch classes but they'll have type 'public'
        classesResponse = await apiClient.getClasses();
      }
      
      const apiClasses = classesResponse.classes.map(apiClass => ({
        ...apiClass,
        icon: createIconElement(apiClass.iconName),
        iconName: apiClass.iconName, // Preserve the iconName field
        teacherName: apiClass.teacherName,
        createdAt: apiClass.createdAt
      }));
      
      return apiClasses;
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  async deleteClass(classId: string): Promise<void> {
    try {
      await apiClient.deleteClass(classId);
    } catch (error) {
      console.error('Error deleting class:', error);
      throw new Error('Failed to delete class. Please try again.');
    }
  }

  canCreateClass(userRole?: string): boolean {
    return userRole === 'teacher' || userRole === 'admin';
  }

  canEditClass(userRole?: string): boolean {
    return userRole === 'teacher' || userRole === 'admin';
  }

  canDeleteClass(userRole?: string): boolean {
    return userRole === 'teacher' || userRole === 'admin';
  }

  convertClassToApiClass(classData: Class): ApiClass {
    return {
      id: classData.id,
      name: classData.name,
      description: classData.description,
      iconName: classData.iconName,
      iconColor: classData.iconColor,
      teacherName: classData.teacherName || 'Teacher',
      studentCount: classData.studentCount,
      assignmentCount: classData.assignmentCount,
      type: classData.type,
      createdAt: classData.createdAt || new Date().toISOString()
    };
  }

  validateClassAccess(userRole?: string): { canAccess: boolean; message?: string } {
    if (!userRole) {
      return { canAccess: false, message: 'You must be logged in to access this feature.' };
    }
    
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return {
        canAccess: false,
        message: 'Only teachers and administrators can access this feature.',
      };
    }
    
    return { canAccess: true };
  }
}

export const classesService = ClassesService.getInstance();
