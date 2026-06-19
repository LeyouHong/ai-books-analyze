import { useState } from 'react'
import {
  Container, Table, Spinner, Alert, Badge,
  Button, Form, InputGroup,
} from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppNavbar from '../components/AppNavbar'
import { getAdminUsers, toggleUserActive } from '../api/admin'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => getAdminUsers({ search }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleUserActive(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-users', search], (old) => {
        if (!old?.results) return old
        return {
          ...old,
          results: old.results.map((u) =>
            u.id === updated.id ? { ...u, is_active: updated.is_active } : u,
          ),
        }
      })
    },
  })

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
  }

  const users = data?.results ?? data ?? []

  return (
    <>
      <AppNavbar />
      <Container className="py-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-3">
          <h4 className="fw-bold mb-0">User Management</h4>

          <Form onSubmit={handleSearch} className="flex-grow-1" style={{ maxWidth: 480, minWidth: 200 }}>
            <InputGroup>
              <InputGroup.Text
                className="border-end-0"
                style={{ borderRadius: '10px 0 0 10px', color: '#adb5bd' }}
              >
                <SearchIcon />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search username, email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="border-start-0 border-end-0 ps-0"
                style={{ boxShadow: 'none' }}
              />
              {search && (
                <Button
                  variant="link"
                  type="button"
                  className="border border-start-0 border-end-0 text-muted px-2"
                  style={{ textDecoration: 'none', background: '#fff' }}
                  onClick={() => { setSearch(''); setSearchInput('') }}
                  title="Clear"
                >
                  ✕
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
                style={{ borderRadius: '0 10px 10px 0', paddingLeft: 20, paddingRight: 20 }}
              >
                Search
              </Button>
            </InputGroup>
          </Form>
        </div>

        {isError && (
          <Alert variant="danger" className="small rounded-3">Failed to load users. Admin access required.</Alert>
        )}

        <div className="table-responsive rounded-3 shadow-sm border">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    {search ? `No users found for "${search}".` : 'No users.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.username}</td>
                    <td className="text-muted small">{u.email}</td>
                    <td>
                      {u.is_staff
                        ? <Badge bg="warning" text="dark">Admin</Badge>
                        : <Badge bg="secondary">User</Badge>}
                    </td>
                    <td>
                      <Badge bg={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-muted small text-nowrap">
                      {new Date(u.date_joined).toLocaleDateString()}
                    </td>
                    <td>
                      {!u.is_staff && (
                        <Button
                          size="sm"
                          variant={u.is_active ? 'outline-danger' : 'outline-success'}
                          className="rounded-3"
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate(u.id)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {data?.count !== undefined && (
          <p className="text-muted small mt-2">{data.count} user{data.count !== 1 ? 's' : ''}</p>
        )}
      </Container>
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
