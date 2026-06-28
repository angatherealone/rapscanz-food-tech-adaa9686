                return (
                  <g key={it.key} className="cursor-pointer" onClick={() => setActive(it)}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={pos.r}
                      fill={isActive ? accentSoftActive : accentSoft}
                      stroke={accent}
                      strokeWidth={isActive ? 2 : 1}
                      className={it.severity === "high" && isHarm ? "animate-pulse" : ""}
                    />
                    <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill={accent} className="text-[7px] font-mono font-bold tracking-widest">
                      {pos.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-3 text-center uppercase tracking-widest">
        {footer}
      </div>
    </div>
  );
}
