# Mutex/Lock Implementation Guide

## What is a Mutex/Lock?

A **mutex** (mutual exclusion) is a synchronization primitive that prevents multiple threads/processes from executing the same critical section simultaneously. Think of it as a "one person at a time" rule for sensitive operations.

## Why You Need It

In your case, the token refresh issue occurred because:

1. Multiple concurrent requests tried to refresh the same token
2. Both found the token in the database
3. First request deleted it
4. Second request tried to delete the already-deleted token → Error!

## Implementation Options

### 1. In-Memory Mutex (Single Instance)

✅ **Best for single server instances**

- Simple and fast
- No external dependencies
- Memory efficient

### 2. Distributed Lock (Multiple Instances)

✅ **Best for clustered/multiple server instances**

- Works across multiple servers
- Uses Redis for coordination
- More complex but scalable

## Usage Examples

### Basic Mutex Usage

```typescript
// Protect token refresh operations
await this.mutexService.withLock(`refresh_token_${token}`, async () => {
  // Critical section - only one execution at a time
  const storedToken = await this.prisma.token.findUnique({...});
  await this.prisma.token.deleteMany({...});
  await this.prisma.token.create({...});
});
```

### User-Based Locking

```typescript
// Prevent concurrent operations for the same user
await this.mutexService.withLock(`user_operation_${userId}`, async () => {
  // Only one operation per user at a time
  await this.updateUserData(userId, data);
});
```

### Resource-Based Locking

```typescript
// Protect specific resources
await this.mutexService.withLock(`job_search_${jobSearchId}`, async () => {
  // Only one modification per job search at a time
  await this.updateJobSearch(jobSearchId, updates);
});
```

## Key Benefits

1. **Prevents Race Conditions**: No more "record not found" errors
2. **Data Consistency**: Ensures operations complete atomically
3. **Better Error Handling**: Fewer unexpected failures
4. **Improved Reliability**: More predictable behavior under load

## When to Use Mutex

Use mutex for operations that:

- ✅ Modify the same database records
- ✅ Have potential race conditions
- ✅ Need to be atomic (all-or-nothing)
- ✅ Are called concurrently with same parameters

Avoid mutex for:

- ❌ Simple read operations
- ❌ Independent operations
- ❌ Operations that don't share state
- ❌ High-frequency operations (can become bottleneck)

## Performance Considerations

- **Lock Granularity**: Use specific keys (e.g., `user_${id}`) not global locks
- **Timeout Handling**: Set reasonable timeouts for distributed locks
- **Lock Duration**: Keep critical sections as short as possible
- **Error Handling**: Always release locks in finally blocks

## Monitoring

You can monitor mutex usage:

```typescript
console.log(`Active locks: ${this.mutexService.getActiveLockCount()}`);
console.log(`Is locked: ${this.mutexService.isLocked('user_123')}`);
```
