import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { parseClubFacultyCSV } from '../utils/csvParser';
import { useAuthStore } from '../stores/authStore';
import { ClubFacultyCSVRow } from '../types';
import toast from 'react-hot-toast';

const CSVUploadSection: React.FC = () => {
    const [csvData, setCsvData] = useState<ClubFacultyCSVRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { bulkCreateFacultyClubAccounts } = useAuthStore();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target?.result as string;
            const result = parseClubFacultyCSV(csvContent);

            if (result.isValid) {
                setCsvData(result.data);
                setErrors([]);
                toast.success(`Parsed ${result.data.length} rows successfully`);
            } else {
                setCsvData([]);
                setErrors(result.errors);
                toast.error(`CSV validation failed: ${result.errors.length} errors found`);
            }
        };
        reader.readAsText(file);
    };

    const handleBulkCreate = async () => {
        if (csvData.length === 0) {
            toast.error('No data to upload');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await bulkCreateFacultyClubAccounts(csvData);

            if (result.success > 0) {
                toast.success(`Successfully created ${result.success} faculty-club associations`);
                setCsvData([]);
                setErrors([]);
            }

            if (result.failed > 0) {
                setErrors(result.errors);
            }
        } catch (error) {
            toast.error('Failed to process bulk creation');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        const template = `clubName,clubEmail,facultyId,facultyName,facultyEmail
Tech Club,techclub@gmail.com,FAC001,Dr. John Smith,john.smith@klu.ac.in
Sports Club,sportsclub@gmail.com,FAC002,Dr. Jane Doe,jane.doe@klu.ac.in`;

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

    return (
        <Card>
            <CardBody>
                <h3 className="font-semibold text-lg mb-4 text-primary-700">
                    Bulk Create Faculty-Club Accounts (CSV Upload)
                </h3>

                <div className="space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <AlertCircle size={18} />
                            CSV Format Instructions
                        </h4>
                        <p className="text-sm text-blue-800 mb-2">
                            Upload a CSV file with the following columns:
                        </p>
                        <code className="block bg-white p-2 rounded text-xs mb-2 font-mono">
                            clubName,clubEmail,facultyId,facultyName,facultyEmail
                        </code>
                        <p className="text-xs text-blue-700 mb-3">
                            Example: Tech Club,tech@gmail.com,FAC001,Dr. Smith,smith@klu.ac.in
                        </p>
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            <Download size={14} />
                            Download CSV Template
                        </button>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select CSV File
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="border px-3 py-2 rounded w-full"
                        />
                    </div>

                    {/* Errors Display */}
                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">
                                Validation Errors ({errors.length})
                            </h4>
                            <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                                {errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Preview Table */}
                    {csvData.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-green-50 border-b border-green-200 p-3">
                                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                    <CheckCircle size={18} />
                                    Preview ({csvData.length} rows)
                                </h4>
                            </div>
                            <div className="overflow-x-auto max-h-64">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-gray-700">Club Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-700">Club Email</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-700">Faculty ID</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-700">Faculty Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-700">Faculty Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvData.map((row, index) => (
                                            <tr key={index} className="border-t hover:bg-gray-50">
                                                <td className="px-4 py-2">{row.clubName}</td>
                                                <td className="px-4 py-2">{row.clubEmail}</td>
                                                <td className="px-4 py-2">{row.facultyId}</td>
                                                <td className="px-4 py-2">{row.facultyName}</td>
                                                <td className="px-4 py-2">{row.facultyEmail}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleBulkCreate}
                            size="md"
                            variant="primary"
                            isLoading={isProcessing}
                            disabled={csvData.length === 0 || isProcessing}
                        >
                            <Upload size={16} className="mr-2" />
                            Upload and Create Accounts
                        </Button>
                        {csvData.length > 0 && (
                            <Button
                                onClick={() => {
                                    setCsvData([]);
                                    setErrors([]);
                                }}
                                size="md"
                                variant="outline"
                                disabled={isProcessing}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

export default CSVUploadSection;
