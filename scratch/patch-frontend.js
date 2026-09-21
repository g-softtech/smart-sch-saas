const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'web-app', 'src', 'app', 'dashboard', 'academics', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const entities = [
  { singular: 'Campus', plural: 'campuses', idField: 'campusId' },
  { singular: 'Department', plural: 'departments', idField: 'departmentId' },
  { singular: 'SubjectGroup', plural: 'subject-groups', idField: 'subjectGroupId' }
];

let stateInjections = '';
let handlerInjections = '';
let buttonInjections = '';
let modalInjections = '';

for (const entity of entities) {
  const { singular, plural } = entity;
  const lowerPlural = plural;
  const nameLabel = singular === 'SubjectGroup' ? 'Subject Group' : singular;

  stateInjections += `
  const [isCreate${singular}ModalOpen, setIsCreate${singular}ModalOpen] = useState(false);
  const [create${singular}Name, setCreate${singular}Name] = useState('');
  const [create${singular}Loading, setCreate${singular}Loading] = useState(false);
  const [create${singular}Error, setCreate${singular}Error] = useState<string | null>(null);
  const [create${singular}Success, setCreate${singular}Success] = useState(false);
`;

  handlerInjections += `
  const openCreate${singular}Modal = () => {
    setCreate${singular}Name('');
    setCreate${singular}Error(null);
    setCreate${singular}Success(false);
    setIsCreate${singular}ModalOpen(true);
  };

  const handleCreate${singular}Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!create${singular}Name.trim()) return;

    setCreate${singular}Loading(true);
    setCreate${singular}Error(null);
    setCreate${singular}Success(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/${plural}', {
        schoolId,
        name: create${singular}Name.trim()
      });

      setCreate${singular}Success(true);
      setCreate${singular}Name('');
      setTimeout(() => {
        setIsCreate${singular}ModalOpen(false);
        setCreate${singular}Success(false);
      }, 1500);

      // Refresh list
      fetchTabData('${plural}', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreate${singular}Error(err.message || 'Failed to create ${singular.toLowerCase()}');
      } else {
        setCreate${singular}Error(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreate${singular}Loading(false);
    }
  };
`;

  buttonInjections += `
        {activeTab === '${plural}' && (
          <button
            onClick={openCreate${singular}Modal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add ${nameLabel}
          </button>
        )}
`;

  modalInjections += `
      {/* Create ${singular} Modal */}
      <Transition.Root show={isCreate${singular}ModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => !create${singular}Loading && setIsCreate${singular}ModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-light px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 border border-gray-200 dark:border-brand-border-dark">
                  <form onSubmit={handleCreate${singular}Submit}>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">
                        Add ${nameLabel}
                      </Dialog.Title>
                      <div className="mt-4">
                        <label htmlFor="${singular}Name" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-gray-text">
                          Name
                        </label>
                        <div className="mt-2">
                          <input
                            type="text"
                            name="${singular}Name"
                            id="${singular}Name"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 dark:bg-brand-navy dark:text-brand-offwhite dark:ring-brand-border-dark dark:placeholder-gray-500"
                            value={create${singular}Name}
                            onChange={(e) => setCreate${singular}Name(e.target.value)}
                            disabled={create${singular}Loading}
                            required
                          />
                        </div>
                      </div>
                      
                      {create${singular}Error && (
                        <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-900/50">
                          <div className="flex">
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{create${singular}Error}</h3>
                            </div>
                          </div>
                        </div>
                      )}

                      {create${singular}Success && (
                        <div className="mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-900/50">
                          <div className="flex">
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800 dark:text-green-400">${nameLabel} created successfully!</h3>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      <button
                        type="submit"
                        disabled={create${singular}Loading || !create${singular}Name.trim()}
                        className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {create${singular}Loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy-light sm:col-start-1 sm:mt-0"
                        onClick={() => setIsCreate${singular}ModalOpen(false)}
                        disabled={create${singular}Loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
`;
}

// Perform replacements!
if (!content.includes('isCreateCampusModalOpen')) {
  // 1. Insert State variables right after Subject state (around line 94)
  content = content.replace(
    /(const \[isCreateSubjectModalOpen, setIsCreateSubjectModalOpen\] = useState\(false\);\n  const \[createSubjectName, setCreateSubjectName\] = useState\(''\);\n  const \[createSubjectLoading, setCreateSubjectLoading\] = useState\(false\);\n  const \[createSubjectError, setCreateSubjectError\] = useState<string \| null>\(null\);\n  const \[createSubjectSuccess, setCreateSubjectSuccess\] = useState\(false\);\n  const \[createSubjectGroupId, setCreateSubjectGroupId\] = useState\(''\);)/,
    `$1\n${stateInjections}`
  );

  // 2. Insert handlers right before function handleEditSubmit (around line 470)
  content = content.replace(
    /(const handleEditSubmit = async \(e: React\.FormEvent\) => {)/,
    `${handlerInjections}\n  $1`
  );

  // 3. Insert buttons right after the Subject button
  content = content.replace(
    /(\{activeTab === 'subjects' && \(\s+<button\s+onClick=\{openCreateSubjectModal\}[\s\S]*?<\/button>\s+\)\})/,
    `$1\n${buttonInjections}`
  );

  // 4. Insert Modals right before the end of the file/last modal
  content = content.replace(
    /(<\!-- Delete Item Modal -->)/i,
    `${modalInjections}\n\n      {/* Delete Item Modal */}`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patch successfully applied!');
} else {
  console.log('Already patched!');
}
