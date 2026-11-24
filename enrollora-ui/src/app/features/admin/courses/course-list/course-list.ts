
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CourseService } from '../course.service';
import {
  CourseResponse,
  SaveCourseRequest,
  CourseFilter
} from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {

  private courseService = inject(CourseService);
  private fb = inject(FormBuilder);

  // Course data
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  // Messages
  successMessage = signal('');
  courseActionError = signal('');

  // ==========================================
  // COURSE FILTERS
  // ==========================================

  filterForm = this.fb.group({
    search: [''],
    isActive: [null as boolean | null],
    availability: [''],
    minFees: [null as number | null],
    maxFees: [null as number | null],
    minCapacity: [null as number | null],
    maxCapacity: [null as number | null]
  });

  // Store currently applied filters
  activeFilters = signal<CourseFilter>({});

  // Apply Filters
  applyFilters(): void {

    const values = this.filterForm.getRawValue();

    const filters: CourseFilter = {
      search: values.search?.trim() || undefined,

      isActive: values.isActive,

      availability: values.availability || undefined,

      minFees: values.minFees,
      maxFees: values.maxFees,

      minCapacity: values.minCapacity,
      maxCapacity: values.maxCapacity
    };

    this.activeFilters.set(filters);

    // Start from first page after filtering
    this.pageNumber.set(1);

    this.loadCourses();
  }

  // Reset Filters
  resetFilters(): void {

    this.filterForm.reset({
      search: '',
      isActive: null,
      availability: '',
      minFees: null,
      maxFees: null,
      minCapacity: null,
      maxCapacity: null
    });

    this.activeFilters.set({});

    this.pageNumber.set(1);

    this.loadCourses();
  }

  // ==========================================
  // ADD COURSE
  // ==========================================

  showAddCourse = signal(false);
  isSubmitting = signal(false);
  addCourseError = signal('');

  // ==========================================
  // VIEW COURSE
  // ==========================================

  selectedCourse = signal<CourseResponse | null>(null);
  showViewCourse = signal(false);
  isViewingCourse = signal(false);
  viewCourseError = signal('');

  // ==========================================
  // EDIT COURSE
  // ==========================================

  showEditCourse = signal(false);
  editingCourseId = signal<number | null>(null);
  isLoadingCourseForEdit = signal(false);
  isUpdatingCourse = signal(false);
  editCourseError = signal('');

  // ==========================================
  // SHARED ADD / EDIT FORM
  // ==========================================

  courseForm = this.fb.group({

    courseName: ['', [
      Validators.required,
      Validators.maxLength(150)
    ]],

    duration: ['', [
      Validators.required,
      Validators.maxLength(80)
    ]],

    fees: [0, [
      Validators.required,
      Validators.min(0)
    ]],

    capacity: [1, [
      Validators.required,
      Validators.min(1),
      Validators.max(100000)
    ]],

    isActive: [true]

  });

  ngOnInit(): void {
    this.loadCourses();
  }

  // ==========================================
  // LOAD COURSES
  // ==========================================

  loadCourses(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService
      .getCourses(
        this.pageNumber(),
        this.pageSize(),
        this.activeFilters()
      )
      .subscribe({

        next: (response) => {

          this.courses.set(response.items);

          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);

          this.isLoading.set(false);
        },

        error: (error) => {

          console.error('Error loading courses:', error);

          this.errorMessage.set('Unable to load courses.');

          this.isLoading.set(false);
        }
      });
  }

  // ==========================================
  // RESET SHARED COURSE FORM
  // ==========================================

  resetCourseForm(): void {

    this.courseForm.reset({
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true
    });
  }

  // ==========================================
  // ADD COURSE
  // ==========================================

  openAddCourse(): void {

    this.resetCourseForm();

    this.addCourseError.set('');
    this.successMessage.set('');

    this.showAddCourse.set(true);
  }

  closeAddCourse(): void {

    if (this.isSubmitting()) {
      return;
    }

    this.showAddCourse.set(false);
    this.addCourseError.set('');
  }

  submitCourse(): void {

    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    const request: SaveCourseRequest = {

      courseName: this.courseForm.value.courseName!.trim(),
      duration: this.courseForm.value.duration!.trim(),
      fees: Number(this.courseForm.value.fees),
      capacity: Number(this.courseForm.value.capacity),
      isActive: this.courseForm.value.isActive ?? true

    };

    this.isSubmitting.set(true);
    this.addCourseError.set('');
    this.successMessage.set('');

    this.courseService.createCourse(request).subscribe({

      next: (response) => {

        console.log('Course created successfully:', response);

        this.isSubmitting.set(false);
        this.showAddCourse.set(false);

        this.successMessage.set(
          `${response.courseName} added successfully!`
        );

        this.resetCourseForm();

        this.pageNumber.set(1);
        this.loadCourses();
      },

      error: (error) => {

        console.error('Error adding course:', error);

        this.isSubmitting.set(false);

        if (error.status === 401) {

          this.addCourseError.set(
            'Session expired or authentication token is invalid. Please log in again.'
          );

        } else if (error.status === 403) {

          this.addCourseError.set(
            'You do not have Administrator permission to add courses.'
          );

        } else {

          this.addCourseError.set(
            error.error?.message ||
            error.error?.title ||
            'Unable to add course. Please try again.'
          );
        }
      }
    });
  }

  // ==========================================
  // VIEW COURSE
  // ==========================================

  viewCourse(id: number): void {

    this.selectedCourse.set(null);
    this.viewCourseError.set('');

    this.isViewingCourse.set(true);
    this.showViewCourse.set(true);

    this.courseService.getCourseById(id).subscribe({

      next: (response) => {

        this.selectedCourse.set(response);
        this.isViewingCourse.set(false);
      },

      error: (error) => {

        console.error('Error loading course details:', error);

        this.viewCourseError.set(
          error.error?.message ||
          error.error?.title ||
          'Unable to load course details. Please try again.'
        );

        this.isViewingCourse.set(false);
      }
    });
  }

  closeViewCourse(): void {

    this.showViewCourse.set(false);
    this.selectedCourse.set(null);
    this.viewCourseError.set('');
  }

  // ==========================================
  // EDIT COURSE
  // ==========================================

  editCourse(id: number): void {

    this.editCourseError.set('');
    this.successMessage.set('');

    this.editingCourseId.set(id);
    this.isLoadingCourseForEdit.set(true);
    this.showEditCourse.set(true);

    this.courseService.getCourseById(id).subscribe({

      next: (course) => {

        this.courseForm.reset({
          courseName: course.courseName,
          duration: course.duration,
          fees: course.fees,
          capacity: course.capacity,
          isActive: course.isActive
        });

        this.isLoadingCourseForEdit.set(false);
      },

      error: (error) => {

        console.error('Error loading course for editing:', error);

        this.editCourseError.set(
          error.error?.message ||
          error.error?.title ||
          'Unable to load course details for editing.'
        );

        this.isLoadingCourseForEdit.set(false);
      }
    });
  }

  closeEditCourse(): void {

    if (this.isUpdatingCourse()) {
      return;
    }

    this.showEditCourse.set(false);
    this.editingCourseId.set(null);
    this.editCourseError.set('');

    this.resetCourseForm();
  }

  submitEditCourse(): void {

    const id = this.editingCourseId();

    if (id === null) {
      return;
    }

    this.updateCourse(id);
  }

  // ==========================================
  // UPDATE COURSE
  // ==========================================

  updateCourse(id: number): void {

    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    if (this.isUpdatingCourse()) {
      return;
    }

    const request: SaveCourseRequest = {

      courseName: this.courseForm.value.courseName!.trim(),
      duration: this.courseForm.value.duration!.trim(),
      fees: Number(this.courseForm.value.fees),
      capacity: Number(this.courseForm.value.capacity),
      isActive: this.courseForm.value.isActive ?? true

    };

    this.isUpdatingCourse.set(true);
    this.editCourseError.set('');

    this.courseService.updateCourse(id, request).subscribe({

      next: (response) => {

        console.log('Course updated successfully:', response);

        this.isUpdatingCourse.set(false);
        this.showEditCourse.set(false);
        this.editingCourseId.set(null);

        this.successMessage.set(
          `${response.courseName} updated successfully!`
        );

        this.resetCourseForm();
        this.loadCourses();
      },

      error: (error) => {

        console.error('Error updating course:', error);

        this.isUpdatingCourse.set(false);

        if (error.status === 401) {

          this.editCourseError.set(
            'Session expired. Please log in again.'
          );

        } else if (error.status === 403) {

          this.editCourseError.set(
            'You do not have Administrator permission to update courses.'
          );

        } else {

          this.editCourseError.set(
            error.error?.message ||
            error.error?.title ||
            'Unable to update course. Please try again.'
          );
        }
      }
    });
  }

  // ==========================================
  // DELETE / DEACTIVATE COURSE
  // ==========================================

  deleteCourse(id: number): void {

    const confirmed = confirm(
      'Are you sure you want to deactivate this course?'
    );

    if (!confirmed) {
      return;
    }

    this.courseActionError.set('');
    this.successMessage.set('');

    this.courseService.deactivateCourse(id).subscribe({

      next: (response) => {

        console.log('Course deactivated:', response);

        this.successMessage.set(
          response.message || 'Course deactivated successfully!'
        );

        // Move to previous page if current page has only one course
        if (
          this.courses().length === 1 &&
          this.pageNumber() > 1
        ) {
          this.pageNumber.update(page => page - 1);
        }

        this.loadCourses();
      },

      error: (error) => {

        console.error('Error deleting course:', error);

        if (error.status === 401) {

          this.courseActionError.set(
            'Session expired. Please log in again.'
          );

        } else if (error.status === 403) {

          this.courseActionError.set(
            'You do not have Administrator permission to delete courses.'
          );

        } else {

          this.courseActionError.set(
            error.error?.message ||
            error.error?.title ||
            'Unable to deactivate course. Please try again.'
          );
        }
      }
    });
  }

  // ==========================================
  // PAGINATION
  // ==========================================

  nextPage(): void {

    if (this.pageNumber() < this.totalPages()) {

      this.pageNumber.update(page => page + 1);

      this.loadCourses();
    }
  }

  previousPage(): void {

    if (this.pageNumber() > 1) {

      this.pageNumber.update(page => page - 1);

      this.loadCourses();
    }
  }
}
