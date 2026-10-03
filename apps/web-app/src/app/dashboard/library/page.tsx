"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  User,
  Shield,
  Tag,
  DollarSign,
  AlertTriangle,
  X,
  Book,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { books: number };
}

interface BookRecord {
  id: string;
  categoryId?: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  totalCopies: number;
  availableCopies: number;
  category?: Category;
  items?: BookItem[];
}

interface BookItem {
  id: string;
  assetTag: string;
  copyNumber: number;
  status: "AVAILABLE" | "BORROWED" | "RESERVED" | "MAINTENANCE" | "LOST";
  location?: string;
  campus?: { id: string; name: string };
}

interface Loan {
  id: string;
  borrowerType: "STUDENT" | "STAFF";
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: "ISSUED" | "OVERDUE" | "RETURNED" | "LOST";
  fineAmount: number;
  invoiceId?: string;
  notes?: string;
  bookItem: {
    assetTag: string;
    copyNumber: number;
    book: { title: string; author: string };
  };
  student?: { firstName: string; lastName: string; studentNumber: string };
  staffProfile?: { firstName: string; lastName: string; staffNumber: string };
}

interface Policy {
  id: string;
  borrowerType: "STUDENT" | "STAFF";
  maxBooksAllowed: number;
  loanDurationDays: number;
  gracePeriodDays: number;
  finePerDay: number;
  maxFineAmount: number;
}

export default function AdminLibraryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "circulation" | "policies">("catalog");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showMarkLostModal, setShowMarkLostModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCategoryId, setBookCategoryId] = useState("");
  const [bookIsbn, setBookIsbn] = useState("");

  const [itemAssetTag, setItemAssetTag] = useState("");
  const [itemCopyNumber, setItemCopyNumber] = useState(1);
  const [itemLocation, setItemLocation] = useState("");

  const [issueBookItemId, setIssueBookItemId] = useState("");
  const [issueBorrowerType, setIssueBorrowerType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [issueStudentId, setIssueStudentId] = useState("");
  const [issueStaffProfileId, setIssueStaffProfileId] = useState("");
  const [issueNotes, setIssueNotes] = useState("");

  const [replacementFee, setReplacementFee] = useState(5000);
  const [lostNotes, setLostNotes] = useState("");

  // Policy form
  const [policyType, setPolicyType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [maxBooks, setMaxBooks] = useState(3);
  const [durationDays, setDurationDays] = useState(14);
  const [graceDays, setGraceDays] = useState(2);
  const [finePerDay, setFinePerDay] = useState(100);
  const [maxFine, setMaxFine] = useState(2000);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "catalog") {
        const [catsRes, booksRes] = await Promise.all([
          apiClient.get<Category[]>("/v1/library/categories"),
          apiClient.get<BookRecord[]>("/v1/library/books"),
        ]);
        setCategories(catsRes || []);
        setBooks(booksRes || []);
      } else if (activeTab === "circulation") {
        const loansRes = await apiClient.get<Loan[]>("/v1/library/loans");
        setLoans(loansRes || []);
      } else if (activeTab === "policies") {
        const polsRes = await apiClient.get<Policy[]>("/v1/library/policies");
        setPolicies(polsRes || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load library data");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/v1/library/categories", {
        name: categoryName,
        description: categoryDesc,
      });
      setSuccess("Category added successfully.");
      setShowAddCategoryModal(false);
      setCategoryName("");
      setCategoryDesc("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add category");
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/v1/library/books", {
        title: bookTitle,
        author: bookAuthor,
        categoryId: bookCategoryId,
        isbn: bookIsbn || undefined,
      });
      setSuccess("Book title created successfully.");
      setShowAddBookModal(false);
      setBookTitle("");
      setBookAuthor("");
      setBookIsbn("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create book");
    }
  };

  const handleAddBookItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      await apiClient.post("/v1/library/items", {
        bookId: selectedBook.id,
        assetTag: itemAssetTag,
        copyNumber: Number(itemCopyNumber),
        location: itemLocation || undefined,
      });
      setSuccess("Physical copy added successfully.");
      setShowAddItemModal(false);
      setItemAssetTag("");
      setItemLocation("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add copy");
    }
  };

  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/v1/library/loans/issue", {
        bookItemId: issueBookItemId,
        borrowerType: issueBorrowerType,
        studentId: issueBorrowerType === "STUDENT" ? issueStudentId : undefined,
        staffProfileId: issueBorrowerType === "STAFF" ? issueStaffProfileId : undefined,
        notes: issueNotes || undefined,
      });
      setSuccess("Loan issued successfully.");
      setShowIssueModal(false);
      setIssueStudentId("");
      setIssueStaffProfileId("");
      setIssueNotes("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to issue loan");
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to process this book return?")) return;
    try {
      await apiClient.post(`/v1/library/loans/${loanId}/return`, {});
      setSuccess("Book copy checked in successfully.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to return book");
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      await apiClient.post(`/v1/library/loans/${selectedLoan.id}/mark-lost`, {
        replacementFee: Number(replacementFee),
        notes: lostNotes || undefined,
      });
      setSuccess("Loan marked as lost and replacement fee invoice generated.");
      setShowMarkLostModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to mark book lost");
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/v1/library/policies", {
        borrowerType: policyType,
        maxBooksAllowed: Number(maxBooks),
        loanDurationDays: Number(durationDays),
        gracePeriodDays: Number(graceDays),
        finePerDay: Number(finePerDay),
        maxFineAmount: Number(maxFine),
      });
      setSuccess("Borrowing policy updated successfully.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save policy");
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !selectedCategory || b.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Library Management</h1>
            <p className="text-sm text-indigo-200">
              Manage book catalog, physical copies, borrowing circulation, and fine policies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-xl border border-indigo-400/30 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Book className="w-4 h-4" />
          Catalog & Inventory
        </button>

        <button
          onClick={() => setActiveTab("circulation")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "circulation"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          Circulation & Loans
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "policies"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          Borrowing Policies
        </button>
      </div>

      {/* TAB 1: CATALOG & INVENTORY */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition"
              >
                + Add Category
              </button>

              <button
                onClick={() => setShowAddBookModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Book Title
              </button>
            </div>
          </div>

          {/* Book Catalog Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="p-4">Title & Author</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">ISBN</th>
                  <th className="p-4">Copies (Total / Available)</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <div>{b.title}</div>
                      <div className="text-xs text-slate-500 font-normal">by {b.author}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{b.category?.name || "Unassigned"}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{b.isbn || "—"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {b.totalCopies} total / {b.availableCopies} available
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedBook(b);
                          setShowAddItemModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-semibold transition"
                      >
                        + Add Physical Copy
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBooks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No books found in library catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CIRCULATION & LOANS */}
      {activeTab === "circulation" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active & Historical Circulation Loans</h2>
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Issue New Loan
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="p-4">Book Copy</th>
                  <th className="p-4">Borrower</th>
                  <th className="p-4">Issued / Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Fine / Invoice</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{l.bookItem?.book?.title}</div>
                      <div className="text-xs font-mono text-slate-500">Tag: {l.bookItem?.assetTag} (Copy #{l.bookItem?.copyNumber})</div>
                    </td>
                    <td className="p-4">
                      {l.borrowerType === "STUDENT" ? (
                        <div>
                          <span className="text-xs font-bold text-sky-600 uppercase">Student</span>: {l.student?.firstName} {l.student?.lastName} ({l.student?.studentNumber})
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-amber-600 uppercase">Staff</span>: {l.staffProfile?.firstName} {l.staffProfile?.lastName} ({l.staffProfile?.staffNumber})
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      <div>Issued: {new Date(l.issuedAt).toLocaleDateString()}</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Due: {new Date(l.dueDate).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          l.status === "ISSUED"
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                            : l.status === "OVERDUE"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : l.status === "RETURNED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium">
                      {l.fineAmount > 0 ? (
                        <div className="text-rose-600 dark:text-rose-400 font-bold">
                          ₦{Number(l.fineAmount).toLocaleString()}
                          {l.invoiceId && <div className="text-[10px] text-slate-400">Invoice: {l.invoiceId.slice(0, 8)}...</div>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {l.status !== "RETURNED" && l.status !== "LOST" && (
                        <>
                          <button
                            onClick={() => handleReturnLoan(l.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold transition"
                          >
                            Return Copy
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLoan(l);
                              setShowMarkLostModal(true);
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition"
                          >
                            Mark Lost
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No circulation loans recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BORROWING POLICIES */}
      {activeTab === "policies" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure Borrower Policy Rules</h2>

          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Borrower Type</label>
              <select
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="STAFF">STAFF</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Max Books Allowed</label>
                <input
                  type="number"
                  min={1}
                  value={maxBooks}
                  onChange={(e) => setMaxBooks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Loan Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={graceDays}
                  onChange={(e) => setGraceDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Fine Per Day (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={finePerDay}
                  onChange={(e) => setFinePerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Max Fine Cap (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={maxFine}
                  onChange={(e) => setMaxFine(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Save Policy Configuration
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Book Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  placeholder="e.g. Science & Fiction"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BOOK TITLE */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Book Title</h3>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select
                  required
                  value={bookCategoryId}
                  onChange={(e) => setBookCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">ISBN (Optional)</label>
                <input
                  type="text"
                  value={bookIsbn}
                  onChange={(e) => setBookIsbn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddBookModal(false)} className="px-4 py-2 border rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
                  Create Book Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BOOK ITEM */}
      {showAddItemModal && selectedBook && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Physical Copy: {selectedBook.title}</h3>
            <form onSubmit={handleAddBookItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Asset Tag (School Unique)</label>
                <input
                  type="text"
                  required
                  value={itemAssetTag}
                  onChange={(e) => setItemAssetTag(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  placeholder="e.g. LIB-2026-001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Copy Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={itemCopyNumber}
                  onChange={(e) => setItemCopyNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Shelf Location (Optional)</label>
                <input
                  type="text"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  placeholder="e.g. Shelf A-3"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddItemModal(false)} className="px-4 py-2 border rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
                  Add Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE LOAN */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue Book Loan</h3>
            <form onSubmit={handleIssueLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Book Item ID</label>
                <input
                  type="text"
                  required
                  value={issueBookItemId}
                  onChange={(e) => setIssueBookItemId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  placeholder="Copy ID"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Borrower Type</label>
                <select
                  value={issueBorrowerType}
                  onChange={(e) => setIssueBorrowerType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>
              {issueBorrowerType === "STUDENT" ? (
                <div>
                  <label className="block text-xs font-semibold mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    value={issueStudentId}
                    onChange={(e) => setIssueStudentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1">Staff Profile ID</label>
                  <input
                    type="text"
                    required
                    value={issueStaffProfileId}
                    onChange={(e) => setIssueStaffProfileId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 border rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
                  Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MARK LOST */}
      {showMarkLostModal && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mark Book Copy Lost</h3>
            <form onSubmit={handleMarkLost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Replacement Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={replacementFee}
                  onChange={(e) => setReplacementFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Notes</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowMarkLostModal(false)} className="px-4 py-2 border rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm">
                  Confirm Lost & Bill Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
