import { TestBed } from '@angular/core/testing';

import { FirebaseStorage } from './firebase-storage';

describe('FirebaseStorage', () => {
  let service: FirebaseStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
