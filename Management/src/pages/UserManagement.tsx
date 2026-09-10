import { UserManagementPage } from '../features/user-management';

import PageCopilot from '../features/copilot/PageCopilot';

const UserManagement = () => {
  return (
    <PageCopilot pageKey="users" scopeLabel="Users">
      <UserManagementPage />
    </PageCopilot>
  );
};

export default UserManagement;
