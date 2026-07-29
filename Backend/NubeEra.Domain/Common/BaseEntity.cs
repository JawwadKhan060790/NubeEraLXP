using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NubeEra.Domain.Common
{
    public abstract class BaseEntity : ISoftDelete
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; } 
        public Guid? CreatedBy { get; set; }

        // ── Audit (Update tracking) ─────────────────────────────────────────────
        /// <summary>UTC timestamp of the most recent update. Null until first updated.</summary>
        public DateTime? UpdatedDate { get; set; }
        /// <summary>Id of the user who performed the most recent update. Null until first updated.</summary>
        public Guid? UpdatedBy { get; set; }

        // ── Soft Delete ──────────────────────────────────────────────────────────
        /// <summary>True when this record has been soft-deleted.</summary>
        public bool      IsDeleted   { get; set; } = false;
        /// <summary>UTC timestamp of deletion. Null when not deleted.</summary>
        public DateTime? DeletedDate { get; set; }
        /// <summary>Id of the user who performed the deletion. Null when not deleted.</summary>
        public Guid?     DeletedBy   { get; set; }
    }
}
