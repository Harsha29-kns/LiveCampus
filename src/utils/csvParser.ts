import { ClubFacultyCSVRow } from '../types';

export interface CSVParseResult {
    data: ClubFacultyCSVRow[];
    errors: string[];
    isValid: boolean;
}

/**
 * Parse CSV file content and validate the data
 * Expected CSV format:
 * clubName,facultyId,facultyName,facultyEmail
 * Tech Club,FAC001,Dr. John Smith,john.smith@klu.ac.in
 */
/**
 * Parse CSV file content and validate the data
 * Expected CSV format:
 * clubName,clubEmail,facultyId,facultyName,facultyEmail
 * Tech Club,techclub@gmail.com,FAC001,Dr. John Smith,john.smith@klu.ac.in
 */
export const parseClubFacultyCSV = (csvContent: string): CSVParseResult => {
    const errors: string[] = [];
    const data: ClubFacultyCSVRow[] = [];

    try {
        const lines = csvContent.trim().split('\n');

        if (lines.length < 2) {
            errors.push('CSV file must contain at least a header row and one data row');
            return { data: [], errors, isValid: false };
        }

        // Validate header
        const header = lines[0].trim().toLowerCase();
        const expectedHeaders = ['clubname', 'clubemail', 'facultyid', 'facultyname', 'facultyemail'];
        const actualHeaders = header.split(',').map(h => h.trim().toLowerCase());

        const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
            return { data: [], errors, isValid: false };
        }

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            const values = line.split(',').map(v => v.trim());

            if (values.length < 5) {
                errors.push(`Row ${i + 1}: Insufficient columns (expected 5, got ${values.length})`);
                continue;
            }

            const [clubName, clubEmail, facultyId, facultyName, facultyEmail] = values;

            // Validate each field
            const rowErrors: string[] = [];

            if (!clubName) {
                rowErrors.push('Club name is required');
            }

            if (!clubEmail) {
                rowErrors.push('Club email is required');
            } else if (!validateEmail(clubEmail)) {
                rowErrors.push(`Invalid club email format: ${clubEmail}`);
            }

            if (!facultyId) {
                rowErrors.push('Faculty ID is required');
            }

            if (!facultyName) {
                rowErrors.push('Faculty name is required');
            }

            if (!facultyEmail) {
                rowErrors.push('Faculty email is required');
            } else if (!validateEmail(facultyEmail)) {
                rowErrors.push(`Invalid email format: ${facultyEmail}`);
            }
            // Temporarily removing strict @klu.ac.in check if faculty uses other emails, 
            // but keeping it if strictly required. User only mentioned Club Email.
            // I'll keep the faculty check as is, as user didn't request changing it.
            else if (!facultyEmail.endsWith('@klu.ac.in')) {
                rowErrors.push(`Faculty email must be a @klu.ac.in address: ${facultyEmail}`);
            }

            if (rowErrors.length > 0) {
                errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
                continue;
            }

            data.push({
                clubName,
                clubEmail,
                facultyId,
                facultyName,
                facultyEmail
            });
        }

        return {
            data,
            errors,
            isValid: errors.length === 0 && data.length > 0
        };
    } catch (error) {
        errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { data: [], errors, isValid: false };
    }
};

/**
 * Validate email format
 */
const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Convert ClubFacultyCSVRow array to CSV string
 */
export const exportToCSV = (data: ClubFacultyCSVRow[]): string => {
    const header = 'clubName,clubEmail,facultyId,facultyName,facultyEmail\n';
    const rows = data.map(row =>
        `${row.clubName},${row.clubEmail},${row.facultyId},${row.facultyName},${row.facultyEmail}`
    ).join('\n');

    return header + rows;
};

/**
 * Download CSV template
 */
export const downloadCSVTemplate = (): void => {
    const template = `clubName,clubEmail,facultyId,facultyName,facultyEmail
Tech Club,tech.club@gmail.com,FAC001,Dr. John Smith,john.smith@klu.ac.in
Sports Club,sports.club@gmail.com,FAC002,Dr. Jane Doe,jane.doe@klu.ac.in`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'club_faculty_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
