import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ResidentImporterProps {
  propertyId: string;
  propertyName: string;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  apartmentNumber?: string;
  residentName?: string;
  email?: string;
  phone?: string;
  moveInDate?: string;
  leaseEndDate?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function ResidentImporter({ propertyId, propertyName }: ResidentImporterProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "complete">("upload");
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const data = results.data as ParsedRow[];
          const headers = Object.keys(data[0]);
          
          setCsvData(data);
          setCsvHeaders(headers);
          
          // Auto-detect common column names
          const autoMapping: ColumnMapping = {};
          headers.forEach(header => {
            const lowerHeader = header.toLowerCase().trim();
            if (lowerHeader.includes("unit") || lowerHeader.includes("apartment") || lowerHeader === "apt") {
              autoMapping.apartmentNumber = header;
            } else if (lowerHeader.includes("name") || lowerHeader.includes("resident")) {
              autoMapping.residentName = header;
            } else if (lowerHeader.includes("email")) {
              autoMapping.email = header;
            } else if (lowerHeader.includes("phone") || lowerHeader.includes("tel")) {
              autoMapping.phone = header;
            } else if (lowerHeader.includes("move") || lowerHeader.includes("movein")) {
              autoMapping.moveInDate = header;
            } else if (lowerHeader.includes("lease") || lowerHeader.includes("end")) {
              autoMapping.leaseEndDate = header;
            }
          });
          
          setColumnMapping(autoMapping);
          setStep("mapping");
          
          toast({
            title: "File loaded",
            description: `Found ${data.length} rows to import`,
          });
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };

  const validateData = (): boolean => {
    const errors: ValidationError[] = [];
    
    if (!columnMapping.apartmentNumber) {
      toast({
        title: "Validation Error",
        description: "Apartment Number is required - please map this column",
        variant: "destructive",
      });
      return false;
    }
    
    if (!columnMapping.residentName) {
      toast({
        title: "Validation Error",
        description: "Resident Name is required - please map this column",
        variant: "destructive",
      });
      return false;
    }

    csvData.forEach((row, index) => {
      // Required fields
      if (!row[columnMapping.apartmentNumber!]?.trim()) {
        errors.push({
          row: index + 1,
          field: "Apartment Number",
          message: "Apartment number is required"
        });
      }
      
      if (!row[columnMapping.residentName!]?.trim()) {
        errors.push({
          row: index + 1,
          field: "Resident Name",
          message: "Resident name is required"
        });
      }

      // Email validation (if provided)
      if (columnMapping.email && row[columnMapping.email]) {
        const email = row[columnMapping.email].trim();
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push({
            row: index + 1,
            field: "Email",
            message: "Invalid email format"
          });
        }
      }

      // Date validation (if provided)
      if (columnMapping.moveInDate && row[columnMapping.moveInDate]) {
        const date = row[columnMapping.moveInDate].trim();
        if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          errors.push({
            row: index + 1,
            field: "Move-in Date",
            message: "Date must be in YYYY-MM-DD format"
          });
        }
      }

      if (columnMapping.leaseEndDate && row[columnMapping.leaseEndDate]) {
        const date = row[columnMapping.leaseEndDate].trim();
        if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          errors.push({
            row: index + 1,
            field: "Lease End Date",
            message: "Date must be in YYYY-MM-DD format"
          });
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleProceedToPreview = () => {
    if (validateData()) {
      setStep("preview");
    }
  };

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const residents = csvData.map(row => ({
        propertyId,
        apartmentNumber: row[columnMapping.apartmentNumber!]?.trim() || "",
        residentName: row[columnMapping.residentName!]?.trim() || "",
        email: columnMapping.email && row[columnMapping.email]?.trim() || undefined,
        phone: columnMapping.phone && row[columnMapping.phone]?.trim() || undefined,
        moveInDate: columnMapping.moveInDate && row[columnMapping.moveInDate]?.trim() || undefined,
        leaseEndDate: columnMapping.leaseEndDate && row[columnMapping.leaseEndDate]?.trim() || undefined,
      }));

      const response = await apiRequest("POST", "/api/residents/import", { residents });
      const result = await response.json();

      setImportResult({
        success: result.imported || 0,
        errors: 0
      });

      queryClient.invalidateQueries({ queryKey: ['/api/residents', propertyId] });
      
      setStep("complete");
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.imported} residents`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setValidationErrors([]);
    setImportResult(null);
    setStep("upload");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Residents for {propertyName}</CardTitle>
          <CardDescription>
            Upload a CSV file to bulk import residents. Only Apartment Number and Resident Name are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-sm text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-xs text-gray-500">CSV files only</div>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-csv-file"
                  />
                  <Button type="button" variant="outline" className="mt-4" data-testid="button-select-file">
                    <Upload className="mr-2 h-4 w-4" />
                    Select CSV File
                  </Button>
                </Label>
              </div>
              <Alert>
                <AlertDescription>
                  <strong>CSV Format Guidelines:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Required: Apartment Number, Resident Name</li>
                    <li>Optional: Email, Phone, Move-in Date (YYYY-MM-DD), Lease End Date (YYYY-MM-DD)</li>
                    <li>First row should contain column headers</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Map Your Columns</h3>
                <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-cancel-mapping">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Match your CSV columns to the system fields. Fields marked with * are required.
              </p>
              
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Label className="font-semibold">System Field</Label>
                  <Label className="font-semibold">Your CSV Column</Label>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Apartment Number *</Label>
                  <Select value={columnMapping.apartmentNumber || ""} onValueChange={(value) => setColumnMapping({...columnMapping, apartmentNumber: value})} data-testid="select-apartment-column">
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Resident Name *</Label>
                  <Select value={columnMapping.residentName || ""} onValueChange={(value) => setColumnMapping({...columnMapping, residentName: value})} data-testid="select-name-column">
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Email (optional)</Label>
                  <Select value={columnMapping.email || "_skip"} onValueChange={(value) => setColumnMapping({...columnMapping, email: value === "_skip" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column or skip..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip this field</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Phone (optional)</Label>
                  <Select value={columnMapping.phone || "_skip"} onValueChange={(value) => setColumnMapping({...columnMapping, phone: value === "_skip" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column or skip..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip this field</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Move-in Date (optional)</Label>
                  <Select value={columnMapping.moveInDate || "_skip"} onValueChange={(value) => setColumnMapping({...columnMapping, moveInDate: value === "_skip" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column or skip..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip this field</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label>Lease End Date (optional)</Label>
                  <Select value={columnMapping.leaseEndDate || "_skip"} onValueChange={(value) => setColumnMapping({...columnMapping, leaseEndDate: value === "_skip" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column or skip..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip this field</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleProceedToPreview} data-testid="button-proceed-preview">
                  Preview Data
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview Import Data</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep("mapping")} data-testid="button-back-mapping">
                  Back to Mapping
                </Button>
              </div>

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">Found {validationErrors.length} validation errors:</div>
                    <ul className="list-disc list-inside mt-2 max-h-40 overflow-y-auto">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index} className="text-sm">
                          Row {error.row}, {error.field}: {error.message}
                        </li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li className="text-sm font-semibold">
                          ...and {validationErrors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apt #</TableHead>
                      <TableHead>Resident Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Move-in</TableHead>
                      <TableHead>Lease End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{columnMapping.apartmentNumber ? row[columnMapping.apartmentNumber] : "-"}</TableCell>
                        <TableCell>{columnMapping.residentName ? row[columnMapping.residentName] : "-"}</TableCell>
                        <TableCell>{columnMapping.email && row[columnMapping.email] ? row[columnMapping.email] : "-"}</TableCell>
                        <TableCell>{columnMapping.phone && row[columnMapping.phone] ? row[columnMapping.phone] : "-"}</TableCell>
                        <TableCell>{columnMapping.moveInDate && row[columnMapping.moveInDate] ? row[columnMapping.moveInDate] : "-"}</TableCell>
                        <TableCell>{columnMapping.leaseEndDate && row[columnMapping.leaseEndDate] ? row[columnMapping.leaseEndDate] : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {csvData.length > 10 && (
                <p className="text-sm text-gray-600 text-center">
                  Showing first 10 of {csvData.length} rows
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>Cancel</Button>
                <Button onClick={handleImport} disabled={isImporting || validationErrors.length > 0} data-testid="button-import">
                  {isImporting ? "Importing..." : `Import ${csvData.length} Residents`}
                </Button>
              </div>
            </div>
          )}

          {step === "complete" && importResult && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
                <p className="text-gray-600">
                  Successfully imported {importResult.success} residents
                </p>
              </div>
              <Button onClick={handleReset} data-testid="button-import-more">
                Import More Residents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
