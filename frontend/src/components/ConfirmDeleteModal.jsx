import { Modal, Button, Spinner } from 'react-bootstrap'

export default function ConfirmDeleteModal({ title, body, onConfirm, onHide, loading }) {
  return (
    <Modal show onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="small text-secondary">{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" className="rounded-3" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" className="rounded-3" onClick={onConfirm} disabled={loading}>
          {loading ? <><Spinner animation="border" size="sm" className="me-1" />Deleting…</> : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
