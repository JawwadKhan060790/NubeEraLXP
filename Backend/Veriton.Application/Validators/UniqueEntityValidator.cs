using System;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;
using Veriton.Application.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;
using Veriton.Domain.Common;

namespace Veriton.Application.Validators;

/// <summary>
/// Generic validator that ensures an entity is unique based on specified property selectors.
/// Apply to a DTO by injecting the repository for the target entity type.
/// Example usage in a FluentValidation validator:
/// RuleFor(x => x)
///     .SetValidator(new UniqueEntityValidator<Grade, GradeCreateDto>(gradeRepository, g => new { g.SchoolId, g.GradeLevel }));
/// </summary>
public class UniqueEntityValidator<TEntity, TDto> : AbstractValidator<TDto>
    where TEntity : BaseEntity
    where TDto : class
{
    private readonly IGenericRepository<TEntity> _repository;
    private readonly Func<TDto, object> _uniqueKeySelector;

    /// <summary>
    /// Constructs the validator.
    /// </summary>
    /// <param name="repository">Repository for the entity type.</param>
    /// <param name="uniqueKeySelector">A function that extracts the values that constitute a unique key from the DTO.</param>
    public UniqueEntityValidator(IGenericRepository<TEntity> repository, Func<TDto, object> uniqueKeySelector)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _uniqueKeySelector = uniqueKeySelector ?? throw new ArgumentNullException(nameof(uniqueKeySelector));

        RuleFor(x => x)
            .MustAsync(BeUniqueAsync)
            .WithMessage("A record with the same unique fields already exists.");
    }

    private async Task<bool> BeUniqueAsync(TDto dto, System.Threading.CancellationToken cancellationToken)
    {
        var key = _uniqueKeySelector(dto);
        // Build a dynamic query based on the anonymous object's properties.
        // EF Core does not support passing anonymous objects directly, so we use reflection to construct a predicate.
        var query = _repository.Query(); // Exposes IQueryable<TEntity>
        var entityType = typeof(TEntity);
        var keyProperties = key.GetType().GetProperties();
        foreach (var prop in keyProperties)
        {
            var value = prop.GetValue(key);
            var entityProp = entityType.GetProperty(prop.Name);
            if (entityProp == null) continue;
            // Build expression: e => e.Prop == value
            var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
            var left = System.Linq.Expressions.Expression.Property(parameter, entityProp);
            var right = System.Linq.Expressions.Expression.Constant(value, entityProp.PropertyType);
            var equality = System.Linq.Expressions.Expression.Equal(left, right);
            var lambda = System.Linq.Expressions.Expression.Lambda<Func<TEntity, bool>>(equality, parameter);
            query = query.Where(lambda);
        }
        return !await query.AnyAsync(cancellationToken);
    }
}
