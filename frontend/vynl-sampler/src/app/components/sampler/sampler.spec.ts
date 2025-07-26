import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sampler } from './sampler';

describe('Sampler', () => {
  let component: Sampler;
  let fixture: ComponentFixture<Sampler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sampler]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sampler);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
