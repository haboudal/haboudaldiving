import { ExportColumn, ExportResult } from '../analytics.types';

export class CSVExporter {
  /**
   * Export data to CSV format
   */
  exportToCSV(
    data: Record<string, unknown>[],
    columns: ExportColumn[],
    filename: string
  ): ExportResult {
    const headers = columns.map((col) => col.header).join(',');
    const rows = data.map((row) => this.formatRow(row, columns)).join('\n');
    const csv = `${headers}\n${rows}`;

    return {
      filename: `${filename}.csv`,
      contentType: 'text/csv',
      data: Buffer.from(csv, 'utf-8'),
    };
  }

  /**
   * Format a single row
   */
  private formatRow(row: Record<string, unknown>, columns: ExportColumn[]): string {
    return columns
      .map((col) => {
        const value = this.getNestedValue(row, col.key);
        return this.formatValue(value, col.format);
      })
      .join(',');
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  /**
   * Format value based on column type
   */
  private formatValue(value: unknown, format?: ExportColumn['format']): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toString() : String(value);

      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : String(value);

      case 'date':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        return String(value);

      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);

      case 'string':
      default:
        return this.escapeCSV(String(value));
    }
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Export bookings data
   */
  exportBookings(
    data: Array<{
      id: string;
      tripDate: string;
      centerName: string;
      siteName: string;
      diverName: string;
      status: string;
      totalPrice: number;
      createdAt: string;
    }>,
    filename: string
  ): ExportResult {
    const columns: ExportColumn[] = [
      { key: 'id', header: 'Booking ID', format: 'string' },
      { key: 'tripDate', header: 'Trip Date', format: 'date' },
      { key: 'centerName', header: 'Diving Center', format: 'string' },
      { key: 'siteName', header: 'Dive Site', format: 'string' },
      { key: 'diverName', header: 'Diver Name', format: 'string' },
      { key: 'status', header: 'Status', format: 'string' },
      { key: 'totalPrice', header: 'Total Price (SAR)', format: 'currency' },
      { key: 'createdAt', header: 'Created At', format: 'date' },
    ];

    return this.exportToCSV(data, columns, filename);
  }

  /**
   * Export revenue data
   */
  exportRevenue(
    data: Array<{
      date: string;
      centerName: string;
      bookings: number;
      revenue: number;
      platformFee: number;
      conservationFee: number;
    }>,
    filename: string
  ): ExportResult {
    const columns: ExportColumn[] = [
      { key: 'date', header: 'Date', format: 'date' },
      { key: 'centerName', header: 'Diving Center', format: 'string' },
      { key: 'bookings', header: 'Bookings', format: 'number' },
      { key: 'revenue', header: 'Revenue (SAR)', format: 'currency' },
      { key: 'platformFee', header: 'Platform Fee (SAR)', format: 'currency' },
      { key: 'conservationFee', header: 'Conservation Fee (SAR)', format: 'currency' },
    ];

    return this.exportToCSV(data, columns, filename);
  }

  /**
   * Export users data
   */
  exportUsers(
    data: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      status: string;
      createdAt: string;
    }>,
    filename: string
  ): ExportResult {
    const columns: ExportColumn[] = [
      { key: 'id', header: 'User ID', format: 'string' },
      { key: 'email', header: 'Email', format: 'string' },
      { key: 'firstName', header: 'First Name', format: 'string' },
      { key: 'lastName', header: 'Last Name', format: 'string' },
      { key: 'role', header: 'Role', format: 'string' },
      { key: 'status', header: 'Status', format: 'string' },
      { key: 'createdAt', header: 'Registered At', format: 'date' },
    ];

    return this.exportToCSV(data, columns, filename);
  }

  /**
   * Export generic report data
   */
  exportReport(
    data: Record<string, unknown>[],
    columns: ExportColumn[],
    reportType: string,
    dateRange: { from: string; to: string }
  ): ExportResult {
    const filename = `${reportType}_${dateRange.from}_${dateRange.to}`;
    return this.exportToCSV(data, columns, filename);
  }
}

export const csvExporter = new CSVExporter();
