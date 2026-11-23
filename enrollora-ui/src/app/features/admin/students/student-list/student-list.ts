
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { StudentService } from '../student.service';

import {
  StudentResponse,
  StudentFilter,
  UpdateStudentRequest
} from '../student.models';

import { AuthService } from '../../../../core/auth/auth.service';

import { RegisterStudentRequest } from '../../../../core/auth/auth.models';


@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {

  private studentService = inject(StudentService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);


  // ==========================================
  // STUDENT LIST VARIABLES
  // ==========================================

  students: StudentResponse[] = [];

  isLoading = false;
  errorMessage = '';

  pageNumber = 1;
  pageSize = 5;
  totalRecords = 0;
  totalPages = 0;


  // ==========================================
  // STUDENT FILTERS
  // ==========================================

  filters: StudentFilter = {
    search: '',
    status: null,
    department: '',
    minAge: null,
    maxAge: null,
    minCgpa: null,
    maxCgpa: null,
  };


  // ==========================================
  // VIEW STUDENT DETAILS
  // ==========================================

  selectedStudent: StudentResponse | null = null;

  isDetailsLoading = false;
  detailsError = '';


  // ==========================================
  // INITIALIZATION
  // ==========================================

  ngOnInit(): void {
    this.loadStudents();
  }


  // ==========================================
  // LOAD STUDENTS
  // ==========================================

  loadStudents(): void {

    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(
      this.pageNumber,
      this.pageSize,
      this.filters
    ).subscribe({

      next: (response) => {

        this.students = response.items;

        this.totalRecords = response.totalRecords;
        this.totalPages = response.totalPages;

        this.pageNumber = response.pageNumber;
        this.pageSize = response.pageSize;

        this.isLoading = false;

        this.cdr.markForCheck();
      },

      error: (error) => {

        console.error('Failed to load students:', error);

        this.errorMessage = 'Unable to load students.';

        this.isLoading = false;

        this.cdr.markForCheck();
      }

    });

  }


  // ==========================================
  // APPROVE STUDENT
  // ==========================================

  approveStudent(id: number): void {

    if (!confirm('Are you sure you want to approve this student?')) {
      return;
    }

    this.studentService.approveStudent(id).subscribe({

      next: (response) => {

        alert(response.message);

        this.loadStudents();
      },

      error: (error) => {

        console.error(error);

        alert('Unable to approve student.');
      }

    });

  }


  // ==========================================
  // REJECT STUDENT
  // ==========================================

  rejectStudent(id: number): void {

    if (!confirm('Are you sure you want to reject this student?')) {
      return;
    }

    this.studentService.rejectStudent(id).subscribe({

      next: (response) => {

        alert(response.message);

        this.loadStudents();
      },

      error: (error) => {

        console.error(error);

        alert('Unable to reject student.');
      }

    });

  }


  // ==========================================
  // PAGINATION
  // ==========================================

  goToPreviousPage(): void {

    if (this.pageNumber > 1) {

      this.pageNumber--;

      this.loadStudents();
    }

  }


  goToNextPage(): void {

    if (this.pageNumber < this.totalPages) {

      this.pageNumber++;

      this.loadStudents();
    }

  }


  changePageSize(size: string): void {

    this.pageSize = Number(size);

    this.pageNumber = 1;

    this.loadStudents();
  }


  // ==========================================
  // APPLY FILTERS
  // ==========================================

  applyFilters(): void {

    this.pageNumber = 1;

    this.loadStudents();
  }


  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  clearFilters(): void {

    this.filters = {
      search: '',
      status: null,
      department: '',
      minAge: null,
      maxAge: null,
      minCgpa: null,
      maxCgpa: null,
    };

    this.pageNumber = 1;

    this.loadStudents();
  }


  // ==========================================
  // VIEW STUDENT DETAILS
  // ==========================================

  viewStudent(id: number): void {

    this.selectedStudent = null;

    this.isDetailsLoading = true;

    this.detailsError = '';

    this.studentService.getStudentById(id).subscribe({

      next: (student) => {

        this.selectedStudent = student;

        this.isDetailsLoading = false;

        this.cdr.markForCheck();
      },

      error: (error) => {

        console.error('Failed to load student details:', error);

        this.detailsError = 'Unable to load student details.';

        this.isDetailsLoading = false;

        this.cdr.markForCheck();
      }

    });

  }


  // ==========================================
  // EDIT STUDENT
  // ==========================================

  isEditModalOpen = false;

  editingStudentId: number | null = null;


  studentForm = new FormGroup({

    name: new FormControl('', Validators.required),

    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),

    department: new FormControl('', Validators.required),

    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60)
    ]),

    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10)
    ]),

  });


  editStudent(id: number): void {

    this.editingStudentId = id;

    this.isEditModalOpen = true;

    this.studentService.getStudentById(id).subscribe({

      next: (student) => {

        this.studentForm.patchValue({

          name: student.name,
          email: student.email,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,

        });

        this.cdr.markForCheck();
      },

      error: (error) => {

        console.error('Failed to load student details', error);
      }

    });

  }


  closeEditModal(): void {

    this.isEditModalOpen = false;

    this.editingStudentId = null;

    this.studentForm.reset({

      name: '',
      email: '',
      department: '',
      age: 18,
      cgpa: 0,

    });

  }


  updateStudent(): void {

    if (this.studentForm.invalid || this.editingStudentId === null) {

      this.studentForm.markAllAsTouched();

      return;
    }

    const formValue = this.studentForm.getRawValue();

    const studentData: UpdateStudentRequest = {

      name: formValue.name!,
      email: formValue.email!,
      department: formValue.department!,
      age: formValue.age!,
      cgpa: formValue.cgpa!,

    };


    this.studentService.updateStudent(
      this.editingStudentId,
      studentData
    ).subscribe({

      next: (updatedStudent) => {

        console.log('Student updated:', updatedStudent);

        this.closeEditModal();

        this.loadStudents();
      },

      error: (error) => {

        console.error('Failed to update student:', error);
      }

    });

  }


  // ==========================================
  // DELETE STUDENT
  // ==========================================

  deleteStudent(id: number): void {

    if (!confirm('Are you sure you want to delete this student?')) {

      return;
    }

    this.studentService.deleteStudent(id).subscribe({

      next: () => {

        this.loadStudents();
      },

      error: (error) => {

        console.error('Failed to delete student:', error);
      }

    });

  }


  // ==========================================
  // ADD STUDENT
  // ==========================================

  isAddModalOpen = false;

  isSubmitting = false;

  addStudentError = '';


  // Separate form for adding students

  addStudentForm = new FormGroup({

    name: new FormControl('', Validators.required),

    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),

    password: new FormControl('', Validators.required),

    department: new FormControl('', Validators.required),

    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60)
    ]),

    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10)
    ]),

  });


  // ==========================================
  // OPEN ADD STUDENT MODAL
  // ==========================================

  openAddModal(): void {

    this.isAddModalOpen = true;

    this.addStudentError = '';

    this.addStudentForm.reset({

      name: '',
      email: '',
      password: '',
      department: '',
      age: 18,
      cgpa: 0,

    });

  }


  // ==========================================
  // CLOSE ADD STUDENT MODAL
  // ==========================================

  closeAddModal(): void {

    this.isAddModalOpen = false;

    this.addStudentError = '';

    this.isSubmitting = false;

    this.addStudentForm.reset({

      name: '',
      email: '',
      password: '',
      department: '',
      age: 18,
      cgpa: 0,

    });

  }


  // ==========================================
  // SUBMIT ADD STUDENT FORM
  // ==========================================

  addStudent(): void {

    // Check form validation

    if (this.addStudentForm.invalid) {

      this.addStudentForm.markAllAsTouched();

      return;
    }

    // Prevent multiple submissions

    if (this.isSubmitting) {

      return;
    }


    // Get form values

    const formValue = this.addStudentForm.getRawValue();


    // Create registration request

    const studentData: RegisterStudentRequest = {

      name: formValue.name!,
      email: formValue.email!,
      password: formValue.password!,
      department: formValue.department!,
      age: formValue.age!,
      cgpa: formValue.cgpa!,

    };


    this.isSubmitting = true;

    this.addStudentError = '';


    // Call existing AuthService registration API

    this.authService.register(studentData).subscribe({

      next: (response) => {

        console.log('Student registered successfully:', response);

        alert(response.message || 'Student registered successfully!');

        this.isSubmitting = false;

        this.closeAddModal();

        // Reset filters and reload student list

        this.clearFilters();

      },

      error: (error) => {

        console.error('Failed to register student:', error);

        this.addStudentError =
          error.error?.message ||
          'Unable to register student. Please try again.';

        this.isSubmitting = false;

        this.cdr.markForCheck();

      }

    });

  }

}
