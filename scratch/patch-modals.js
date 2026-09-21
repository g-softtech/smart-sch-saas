const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'web-app', 'src', 'app', 'dashboard', 'academics', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const entities = [
  { singular: 'Campus', plural: 'campuses', idField: 'campusId' },
  { singular: 'Department', plural: 'departments', idField: 'departmentId' },
  { singular: 'SubjectGroup', plural: 'subject-groups', idField: 'subjectGroupId' }
];

let modalInjections = '';

for (const entity of entities) {
  const { singular } = entity;
  const nameLabel = singular === 'SubjectGroup' ? 'Subject Group' : singular;

  modalInjections += `
      {isCreate${singular}ModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => !create${singular}Loading && setIsCreate${singular}ModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add ${nameLabel}</h3>
                <form onSubmit={handleCreate${singular}Submit} className="mt-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                      Name
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={create${singular}Name}
                        onChange={(e) => setCreate${singular}Name(e.target.value)}
                        disabled={create${singular}Loading}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        placeholder="e.g. ${nameLabel} Name"
                      />
                    </div>
                  </div>

                  {create${singular}Error && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {create${singular}Error}
                    </div>
                  )}

                  {create${singular}Success && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                      ${nameLabel} created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={create${singular}Loading || !create${singular}Name.trim()}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {create${singular}Loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreate${singular}ModalOpen(false)}
                      disabled={create${singular}Loading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
`;
}

// Replace right before the end of the AcademicsPage component
if (!content.includes('isCreateCampusModalOpen && (')) {
  content = content.replace(
    /\n    <\/div>\n  \);\n}\n/g,
    `\n${modalInjections}\n    </div>\n  );\n}\n`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Modals injected!');
} else {
  console.log('Modals already injected!');
}
