import { TestBed } from '@angular/core/testing';

import { PendingApproval } from './pending-approval';

describe('PendingApproval', () => {
  let service: PendingApproval;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PendingApproval);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
