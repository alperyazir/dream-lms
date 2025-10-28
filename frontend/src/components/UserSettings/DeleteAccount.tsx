import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  return (
    <div className="max-w-full">
      <h3 className="text-sm font-semibold py-4">Delete Account</h3>
      <p>
        Permanently delete your data and everything associated with your
        account.
      </p>
      <DeleteConfirmation />
    </div>
  )
}
export default DeleteAccount
