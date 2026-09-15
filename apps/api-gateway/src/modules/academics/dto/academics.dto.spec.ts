import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateTermDto } from './academics.dto';

describe('CreateTermDto', () => {
  it('should pass with valid academicYearId and name', async () => {
    const dto = new CreateTermDto();
    dto.academicYearId = 'year-1';
    dto.name = 'Fall Term';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when academicYearId is missing', async () => {
    const dto = new CreateTermDto();
    dto.name = 'Fall Term';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('academicYearId');
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateTermDto();
    dto.academicYearId = 'year-1';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });
});
